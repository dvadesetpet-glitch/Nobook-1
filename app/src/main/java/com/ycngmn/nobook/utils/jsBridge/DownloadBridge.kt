package com.ycngmn.nobook.utils.jsBridge

import android.content.ContentValues
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMuxer
import java.nio.ByteBuffer
import android.os.Build
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.MimeTypeMap
import android.widget.Toast
import com.ycngmn.nobook.R
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class DownloadBridge(private val context: Context) {
    @JavascriptInterface
    fun downloadBase64File(base64Data: String, mimeType: String) {
        runCatching {
            if (!base64Data.contains(",")) {
                Toast.makeText(
                    context,
                    context.getString(R.string.download_failed_invalid_data),
                    Toast.LENGTH_SHORT
                ).show()
                return
            }

            val data = Base64.decode(base64Data.split(",")[1], Base64.DEFAULT)

            // Determine if it's an image or video
            val isImage = mimeType.startsWith("image/")
            val isVideo = mimeType.startsWith("video/")

            val (finalData, finalMimeType, extension) = when {
                isImage -> {
                    // Convert images to PNG for maximum compatibility
                    val bitmap = BitmapFactory.decodeByteArray(data, 0, data.size)
                    if (bitmap != null) {
                        val outputStream = ByteArrayOutputStream()
                        bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream)
                        Triple(outputStream.toByteArray(), "image/png", "png")
                    } else {
                        // If bitmap decoding fails, use original data
                        val ext = MimeTypeMap.getSingleton().getExtensionFromMimeType(mimeType) ?: "bin"
                        Triple(data, mimeType, ext)
                    }
                }
                isVideo -> {
                    // Keep videos as-is
                    val ext = MimeTypeMap.getSingleton().getExtensionFromMimeType(mimeType) ?: "mp4"
                    Triple(data, mimeType, ext)
                }
                else -> {
                    // Unknown type, keep as-is
                    val ext = MimeTypeMap.getSingleton().getExtensionFromMimeType(mimeType) ?: "bin"
                    Triple(data, mimeType, ext)
                }
            }

            val fileName = "${System.currentTimeMillis()}.$extension"

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val contentValues = ContentValues().apply {
                    put(MediaStore.Downloads.DISPLAY_NAME, fileName)
                    put(MediaStore.Downloads.MIME_TYPE, finalMimeType)
                    put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                    put(MediaStore.Downloads.IS_PENDING, 1)
                }

                val resolver = context.contentResolver
                val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)

                uri?.let {
                    resolver.openOutputStream(it)?.use { outputStream ->
                        outputStream.write(finalData)
                    }
                    contentValues.clear()
                    contentValues.put(MediaStore.Downloads.IS_PENDING, 0)
                    resolver.update(uri, contentValues, null, null)

                    Toast.makeText(
                        context,
                        context.getString(R.string.saved_to_downloads),
                        Toast.LENGTH_SHORT
                    ).show()
                }
            } else {
                val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                val file = File(downloadsDir, fileName)

                FileOutputStream(file).use { it.write(finalData) }
                Toast.makeText(
                    context,
                    context.getString(R.string.saved_to_downloads),
                    Toast.LENGTH_SHORT
                ).show()
            }
        }.onFailure {
            Toast.makeText(
                context,
                context.getString(R.string.failed_to_save_file),
                Toast.LENGTH_SHORT
            ).show()
        }
    }

    /**
     * Downloads a direct media link (fbcdn mp4 / jpg) natively, streaming it straight into the
     * Downloads folder. Avoids the base64 round trip through JS, which is slow and breaks on videos.
     */
    @JavascriptInterface
    fun downloadUrl(url: String) {
        if (!url.startsWith("https://")) {
            toast(R.string.download_failed_invalid_data)
            return
        }
        thread(name = "nobook-download") {
            runCatching {
                val conn = URL(url).openConnection() as HttpURLConnection
                conn.connectTimeout = 15_000
                conn.readTimeout = 30_000
                conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/154 Mobile Safari/537.36")
                try {
                    if (conn.responseCode !in 200..299) error("HTTP ${conn.responseCode}")
                    val mime = conn.contentType?.substringBefore(';')?.trim().orEmpty()
                        .ifEmpty { if (url.contains(".mp4")) "video/mp4" else "image/jpeg" }
                    val ext = MimeTypeMap.getSingleton().getExtensionFromMimeType(mime)
                        ?: if (mime.startsWith("video/")) "mp4" else "jpg"
                    val name = "${System.currentTimeMillis()}.$ext"
                    conn.inputStream.use { input -> saveStream(name, mime) { input.copyTo(it) } }
                } finally {
                    conn.disconnect()
                }
                toast(R.string.saved_to_downloads)
            }.onFailure { toast(R.string.failed_to_save_file) }
        }
    }

    /**
     * Streamed videos come as separate video-only and audio-only DASH tracks. Downloads both and
     * muxes them into a single mp4 in Downloads. [audioUrl] may be empty for silent clips.
     */
    @JavascriptInterface
    fun downloadDash(videoUrl: String, audioUrl: String) {
        if (!videoUrl.startsWith("https://")) {
            toast(R.string.download_failed_invalid_data)
            return
        }
        thread(name = "nobook-dash") {
            val stamp = System.currentTimeMillis()
            val videoFile = File(context.cacheDir, "dash_$stamp.v.mp4")
            val audioFile = File(context.cacheDir, "dash_$stamp.a.mp4")
            val outFile = File(context.cacheDir, "dash_$stamp.mp4")
            runCatching {
                fetchTo(videoUrl, videoFile)
                val hasAudio = audioUrl.startsWith("https://")
                if (hasAudio) fetchTo(audioUrl, audioFile)
                mux(videoFile, if (hasAudio) audioFile else null, outFile)
                outFile.inputStream().use { input ->
                    saveStream("$stamp.mp4", "video/mp4") { input.copyTo(it) }
                }
                toast(R.string.saved_to_downloads)
            }.onFailure { toast(R.string.failed_to_save_file) }
            videoFile.delete(); audioFile.delete(); outFile.delete()
        }
    }

    private fun fetchTo(url: String, target: File) {
        val conn = URL(url).openConnection() as HttpURLConnection
        conn.connectTimeout = 15_000
        conn.readTimeout = 30_000
        try {
            if (conn.responseCode !in 200..299) error("HTTP ${conn.responseCode}")
            conn.inputStream.use { input -> FileOutputStream(target).use { input.copyTo(it) } }
        } finally {
            conn.disconnect()
        }
    }

    private fun mux(video: File, audio: File?, out: File) {
        val sources = listOfNotNull(video, audio).map { file ->
            MediaExtractor().apply { setDataSource(file.path) }
        }
        val muxer = MediaMuxer(out.path, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
        try {
            val trackMap = sources.map { extractor ->
                val index = (0 until extractor.trackCount).first {
                    val mime = extractor.getTrackFormat(it).getString(MediaFormat.KEY_MIME).orEmpty()
                    mime.startsWith("video/") || mime.startsWith("audio/")
                }
                extractor.selectTrack(index)
                val format = extractor.getTrackFormat(index)
                // The extractor reports track-fourcc = -1 for HE-AAC; the muxer would write that
                // as the sample-entry type and the audio would be unplayable.
                if (format.getString(MediaFormat.KEY_MIME) == MediaFormat.MIMETYPE_AUDIO_AAC) {
                    format.setInteger("track-fourcc", 0x6d703461) // 'mp4a'
                }
                muxer.addTrack(format)
            }
            muxer.start()

            val buffer = ByteBuffer.allocate(2 * 1024 * 1024)
            val info = MediaCodec.BufferInfo()
            // Interleave by timestamp so players can stream the result.
            while (true) {
                val next = sources.indices
                    // AAC starts with a negative priming offset, so test for a sample, not for time >= 0
                    .filter { sources[it].sampleTrackIndex >= 0 }
                    .minByOrNull { sources[it].sampleTime } ?: break
                val extractor = sources[next]
                buffer.clear()
                val size = extractor.readSampleData(buffer, 0)
                if (size < 0) { extractor.advance(); continue }
                info.set(
                    0, size, maxOf(0L, extractor.sampleTime),
                    if (extractor.sampleFlags and MediaExtractor.SAMPLE_FLAG_SYNC != 0)
                        MediaCodec.BUFFER_FLAG_KEY_FRAME else 0
                )
                muxer.writeSampleData(trackMap[next], buffer, info)
                extractor.advance()
            }
            muxer.stop()
        } finally {
            runCatching { muxer.release() }
            sources.forEach { it.release() }
        }
    }

    private fun toast(resId: Int) {
        Handler(Looper.getMainLooper()).post {
            Toast.makeText(context, context.getString(resId), Toast.LENGTH_SHORT).show()
        }
    }

    private fun saveStream(fileName: String, mime: String, write: (java.io.OutputStream) -> Unit) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val values = ContentValues().apply {
                put(MediaStore.Downloads.DISPLAY_NAME, fileName)
                put(MediaStore.Downloads.MIME_TYPE, mime)
                put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                put(MediaStore.Downloads.IS_PENDING, 1)
            }
            val resolver = context.contentResolver
            val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values) ?: error("insert failed")
            resolver.openOutputStream(uri)?.use(write) ?: error("no stream")
            values.clear()
            values.put(MediaStore.Downloads.IS_PENDING, 0)
            resolver.update(uri, values, null, null)
        } else {
            val dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
            FileOutputStream(File(dir, fileName)).use(write)
        }
    }
}
