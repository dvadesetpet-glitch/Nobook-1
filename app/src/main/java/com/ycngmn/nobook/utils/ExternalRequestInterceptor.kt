package com.ycngmn.nobook.utils

import android.os.Handler
import android.os.Looper
import com.multiplatform.webview.request.RequestInterceptor
import com.multiplatform.webview.request.WebRequest
import com.multiplatform.webview.request.WebRequestInterceptResult
import com.multiplatform.webview.web.WebViewNavigator

class ExternalRequestInterceptor(
    /** Called with the URL of every main-frame navigation that stays in the app (before it loads). */
    private val onMainFrameUrl: (String) -> Unit = {},
    private val handleExternalUrl: (String) -> Unit
) : RequestInterceptor {

    private val mainHandler = Handler(Looper.getMainLooper())

    override fun onInterceptUrlRequest(
        request: WebRequest,
        navigator: WebViewNavigator
    ): WebRequestInterceptResult {

        // Messenger links are loaded in the app (as facebook.com/messages) instead of leaving it.
        if (request.isForMainFrame) {
            val internal = MessengerLinks.toInternalUrl(request.url)
            if (internal != null && internal != request.url) {
                onMainFrameUrl(internal)
                mainHandler.post { navigator.loadUrl(internal) }
                return WebRequestInterceptResult.Reject
            }
        }

        val internalUrlRegex = Regex(
            """https?://(?!(?:l|lm)\.)[^/]*(?:facebook|messenger)\.com/.*"""
        )
        return if (internalUrlRegex.containsMatchIn(request.url) && request.isForMainFrame) {
            onMainFrameUrl(request.url)
            WebRequestInterceptResult.Allow
        } else {
            handleExternalUrl(fbRedirectSanitizer(request.url))
            WebRequestInterceptResult.Reject
        }
    }
}
