package com.ycngmn.nobook

import android.content.pm.ApplicationInfo
import android.content.Intent
import android.os.Bundle
import android.webkit.WebView
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.core.view.WindowCompat
import com.ycngmn.nobook.ui.screens.NobookWebView
import com.ycngmn.nobook.ui.theme.NobookTheme

class MainActivity : ComponentActivity() {

    // The link this activity was started with; replaced when another link arrives while running.
    private var linkUrl by mutableStateOf<String?>(null)

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        intent.data?.toString()?.let { linkUrl = it }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

        // Lets chrome://inspect attach to the WebView. Debug builds only (release is not debuggable).
        if (applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0) {
            WebView.setWebContentsDebuggingEnabled(true)
        }

        linkUrl = intent?.data?.toString()

        setContent {
            NobookTheme {
                NobookWebView(
                    url = linkUrl ?: "https://facebook.com/"
                )
            }
        }
    }
}