package com.ycngmn.nobook.utils.jsBridge

import android.webkit.JavascriptInterface

class AdFilteringBridge(private val onBlocked: (Int) -> Unit) {
    @JavascriptInterface
    fun reportBlocked(total: Int) {
        onBlocked(total)
    }
}
