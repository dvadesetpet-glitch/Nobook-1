package com.ycngmn.nobook.utils.jsBridge

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import android.widget.Toast
import com.ycngmn.nobook.R

/** Copies the link of the photo / video on screen (copy_to_clipboard.js). */
class ClipboardBridge(private val context: Context) {
    @JavascriptInterface
    fun copyLink(url: String) {
        // JavaScript interface calls arrive on a background thread.
        Handler(Looper.getMainLooper()).post {
            val copied = runCatching {
                val clipboardManager = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                clipboardManager.setPrimaryClip(ClipData.newPlainText("Link", url))
            }.isSuccess
            Toast.makeText(
                context,
                context.getString(if (copied) R.string.link_copied_to_clipboard else R.string.failed_to_copy_link),
                Toast.LENGTH_SHORT
            ).show()
        }
    }
}
