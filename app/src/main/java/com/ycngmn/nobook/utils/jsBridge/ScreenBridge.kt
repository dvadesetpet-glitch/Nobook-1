package com.ycngmn.nobook.utils.jsBridge

import android.app.Activity
import android.view.WindowManager
import android.webkit.JavascriptInterface

/**
 * Lets the page keep the screen awake while a video plays. A bare WebView does not do this on
 * its own (Chrome does), so the phone dimmed and locked in the middle of a reel.
 */
class ScreenBridge(private val activity: Activity?) {
    @JavascriptInterface
    fun setKeepScreenOn(keepOn: Boolean) {
        val act = activity ?: return
        act.runOnUiThread {
            if (keepOn) act.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            else act.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
    }
}
