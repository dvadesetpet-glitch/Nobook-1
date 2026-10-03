package com.ycngmn.nobook.utils

import androidx.annotation.RawRes
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.request.get
import io.ktor.http.HttpStatusCode


const val SCRIPT_SRC = "https://raw.githubusercontent.com/ycngmn/Nobook/refs/heads/main/app/src/main/res/raw/"

data class Script(
    val isEnabled: Boolean,
    @param:RawRes val resourceId:  Int,
    val scriptTitle: String
)

suspend fun fetchScripts(
    scripts: List<Script>,
    fallbackContent: (Int) -> String
): String {
    val httpClient = HttpClient(OkHttp)
    val scriptContent = buildString {
        scripts.filter { it.isEnabled }.forEach { script ->
            val content =
                runCatching {
                    val res = httpClient.get(SCRIPT_SRC + script.scriptTitle)
                    if (res.status == HttpStatusCode.OK) {
                        res.body() as String
                    } else {
                        throw Exception()
                    }
                }.getOrElse {
                    fallbackContent(script.resourceId)
                }
            append(content)
        }
    }
    return minifyJavaScript(scriptContent)
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
