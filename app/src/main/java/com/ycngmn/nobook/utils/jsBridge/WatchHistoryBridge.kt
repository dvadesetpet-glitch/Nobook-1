package com.ycngmn.nobook.utils.jsBridge

import android.webkit.JavascriptInterface
import com.ycngmn.nobook.ui.viewmodel.WatchHistoryViewModel

class WatchHistoryBridge(private val viewModel: WatchHistoryViewModel) {
    @JavascriptInterface
    fun recordWatch(url: String, title: String? = null, thumbnail: String? = null) {
        viewModel.addWatch(url, title, thumbnail)
    }

    @JavascriptInterface
    fun recordVideoWatch(videoId: String, title: String? = null) {
        val videoUrl = "https://www.facebook.com/watch/?v=$videoId"
        viewModel.addWatch(videoUrl, title, null)
    }

    @JavascriptInterface
    fun recordPostWatch(postId: String, authorName: String? = null) {
        val postUrl = "https://www.facebook.com/$postId"
        viewModel.addWatch(postUrl, authorName, null)
    }
}
