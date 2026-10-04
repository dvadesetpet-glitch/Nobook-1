package com.ycngmn.nobook.utils

import java.net.URI

/**
 * Keeps Messenger inside Nobook. messenger.com was retired in April 2026 and redirects to
 * facebook.com/messages, so every Messenger link (m.me, messenger.com, fb-messenger://, the
 * mobile /messages paths) is mapped to a facebook.com/messages URL that Nobook can load itself.
 */
object MessengerLinks {
    const val MESSAGES_URL = "https://www.facebook.com/messages/"

    private val facebookHosts = setOf(
        "facebook.com", "www.facebook.com", "m.facebook.com",
        "web.facebook.com", "touch.facebook.com", "mbasic.facebook.com"
    )

    /** The in-app URL for a Messenger link, or null when [url] is not a Messenger link. */
    fun toInternalUrl(url: String): String? {
        val lower = url.lowercase()
        if (lower.startsWith("fb-messenger://") ||
            lower.startsWith("fb-messenger-public://") ||
            lower.startsWith("fb-messenger-secure://")
        ) return MESSAGES_URL
        if (lower.startsWith("intent://") &&
            (lower.contains("package=com.facebook.orca") || lower.contains("messenger"))
        ) return MESSAGES_URL

        val uri = try { URI(url) } catch (_: Exception) { return null }
        val scheme = uri.scheme?.lowercase()
        if (scheme != "http" && scheme != "https") return null
        val host = uri.host?.lowercase() ?: return null
        val path = uri.rawPath.orEmpty()

        return when {
            host == "m.me" ->
                if (path.length > 1) "https://www.facebook.com/messages/t$path" else MESSAGES_URL
            host == "messenger.com" || host == "www.messenger.com" -> MESSAGES_URL
            host in facebookHosts && isMessagesPath(path) ->
                if (host == "www.facebook.com") url
                else "https://www.facebook.com" + path + (uri.rawQuery?.let { "?$it" } ?: "")
            else -> null
        }
    }

    /** True for pages that only work in the desktop layout (the mobile site pushes the app). */
    fun needsDesktopSite(url: String?): Boolean {
        if (url == null) return false
        val uri = try { URI(url) } catch (_: Exception) { return false }
        val host = uri.host?.lowercase() ?: return false
        return host in facebookHosts && isMessagesPath(uri.rawPath.orEmpty())
    }

    private fun isMessagesPath(path: String) = path == "/messages" || path.startsWith("/messages/")
}
