package com.ycngmn.nobook.utils

import androidx.annotation.RawRes
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.request.get
import io.ktor.http.HttpStatusCode
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull


const val SCRIPT_SRC = "https://raw.githubusercontent.com/ycngmn/Nobook/refs/heads/main/app/src/main/res/raw/"

private const val FETCH_TIMEOUT_MS = 4_000L

data class Script(
    val isEnabled: Boolean,
    @param:RawRes val resourceId:  Int,
    val scriptTitle: String,
    /** False for scripts that only exist in this fork: upstream has no such file (it would 404). */
    val fetchRemote: Boolean = true
)

/**
 * Builds the injected bundle. Upstream copies are fetched in parallel (each with a timeout) and
 * the bundled resource is used when the fetch fails; fork-only scripts skip the network entirely.
 * The splash screen waits for this, so the old one-request-after-another loop made every start
 * as slow as the sum of all requests.
 */
suspend fun fetchScripts(
    scripts: List<Script>,
    fallbackContent: (Int) -> String
): String = withContext(Dispatchers.IO) {
    val enabled = scripts.filter { it.isEnabled }
    val httpClient = if (enabled.any { it.fetchRemote }) HttpClient(OkHttp) else null
    try {
        val parts = coroutineScope {
            enabled.map { script ->
                async {
                    val remote =
                        if (httpClient != null && script.fetchRemote) fetchRemoteScript(httpClient, script)
                        else null
                    remote ?: fallbackContent(script.resourceId)
                }
            }.awaitAll()
        }
        wrapBundle(minifyJavaScript(parts.joinToString("\n")))
    } finally {
        httpClient?.close()
    }
}

private suspend fun fetchRemoteScript(client: HttpClient, script: Script): String? =
    withTimeoutOrNull(FETCH_TIMEOUT_MS) {
        try {
            val res = client.get(SCRIPT_SRC + script.scriptTitle)
            if (res.status == HttpStatusCode.OK) res.body<String>() else null
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            null
        }
    }

/**
 * Safe minification: strips comments and blank lines, trims indentation.
 * Scans strings, template literals and regex literals so their contents are untouched.
 * Keeps newlines, so code that relies on automatic semicolon insertion still works.
 */
internal fun minifyJavaScript(js: String): String {
    val out = StringBuilder(js.length)
    var i = 0
    val n = js.length
    // Last significant char, used to tell a regex literal from division.
    var last = '\n'

    fun regexAllowed() = last in "(,=:[!&|?{};+-*%<>~^\n"

    while (i < n) {
        val c = js[i]
        when {
            c == '/' && i + 1 < n && js[i + 1] == '/' -> {
                while (i < n && js[i] != '\n') i++
            }
            c == '/' && i + 1 < n && js[i + 1] == '*' -> {
                val end = js.indexOf("*/", i + 2)
                i = if (end < 0) n else end + 2
                out.append(' ')
            }
            c == '"' || c == '\'' || c == '`' -> {
                out.append(c)
                i++
                while (i < n) {
                    val d = js[i]
                    out.append(d)
                    i++
                    if (d == '\\' && i < n) {
                        out.append(js[i])
                        i++
                    } else if (d == c) break
                }
                last = c
            }
            c == '/' && regexAllowed() -> {
                out.append(c)
                i++
                var inClass = false
                while (i < n && js[i] != '\n') {
                    val d = js[i]
                    out.append(d)
                    i++
                    if (d == '\\' && i < n) {
                        out.append(js[i])
                        i++
                    } else if (d == '[') inClass = true
                    else if (d == ']') inClass = false
                    else if (d == '/' && !inClass) break
                }
                last = '/'
            }
            else -> {
                out.append(c)
                if (!c.isWhitespace()) last = c else if (c == '\n') last = '\n'
                i++
            }
        }
    }

    return out.lineSequence()
        .map { it.trim() }
        .filter { it.isNotEmpty() }
        .joinToString("\n")
}

/**
 * Runs the whole bundle once per document, inside its own function scope.
 * The page fires "finished loading" several times per document and the bundle is evaluated each
 * time; scripts.js declares a top-level `const observer`, so the second evaluation threw
 * "Identifier 'observer' has already been declared" and the rest of the bundle was skipped.
 */
internal fun wrapBundle(js: String): String =
    "if (!window.__nobookBundle) {\nwindow.__nobookBundle = true;\n(function() {\n$js\n})();\n}"
