package com.ycngmn.nobook.ui.viewmodel

import android.content.res.Resources
import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.graphics.Color
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ycngmn.nobook.R
import com.ycngmn.nobook.utils.Script
import com.ycngmn.nobook.utils.fetchScripts
import kotlinx.coroutines.launch


class MainViewModel(
    resources: Resources,
    settings: SettingsViewModel
): ViewModel() {

    private val _themeColor = mutableStateOf(Color.Transparent)
    val themeColor: State<Color> = _themeColor

    private val _scripts = mutableStateOf<String?>(null)
    val scripts: State<String?> = _scripts

    private val _blockedAdCount = mutableStateOf(0)
    val blockedAdCount: State<Int> = _blockedAdCount

    fun setBlockedAdCount(count: Int) {
        _blockedAdCount.value = count
    }

    init {
        loadScripts(
            resources,
            settings
        )
    }

    fun setThemeColor(color: Color) {
        _themeColor.value = color
    }

    private fun loadScripts(
        resources: Resources,
        settings: SettingsViewModel
    ) {
        val scripts = listOf(
            Script(true, R.raw.perf_shim, "perf_shim.js"), // must run before observers are created
            Script(true, R.raw.scripts, "scripts.js"), // always apply
            Script(settings.removeAds.value, R.raw.adblock, "adblock.js"),
            Script(settings.removeAds.value, R.raw.adblock_enhanced, "adblock_enhanced.js"),
            Script(settings.removeAds.value, R.raw.hide_adblock_toast, "hide_adblock_toast.js"),
            Script(settings.removeAds.value, R.raw.adblock_feed_fix, "adblock_feed_fix.js"),
            Script(true, R.raw.fix_media_source, "fix_media_source.js"),
            Script(true, R.raw.hide_open_app, "hide_open_app.js"),
            Script(true, R.raw.haptic_feedback, "haptic_feedback.js"),
            Script(true, R.raw.remove_all, "remove_all.js"),
            Script(settings.enableDownloadContent.value, R.raw.download_content, "download_content.js"),
            Script(settings.enableCopyToClipboard.value, R.raw.copy_to_clipboard, "copy_to_clipboard.js"),
            Script(settings.stickyNavbar.value, R.raw.sticky_navbar, "sticky_navbar.js"),
            Script(!settings.pinchToZoom.value, R.raw.pinch_to_zoom, "pinch_to_zoom.js"),
            Script(settings.amoledBlack.value, R.raw.amoled_black, "amoled_black.js"),
            Script(settings.hideSuggested.value, R.raw.hide_suggested, "hide_suggested.js"),
            Script(settings.hideReels.value, R.raw.hide_reels, "hide_reels.js"),
            Script(true, R.raw.watch_history, "watch_history.js"),
            Script(!settings.hideReels.value, R.raw.reel_controls, "reel_controls.js"),
            Script(settings.hideStories.value, R.raw.hide_stories, "hide_stories.js"),
            Script(settings.hidePeopleYouMayKnow.value, R.raw.hide_pymk, "hide_pymk.js"),
            Script(settings.hideGroups.value, R.raw.hide_groups, "hide_groups.js")
        )

        viewModelScope.launch {
            _scripts.value =
                fetchScripts(
                    scripts = scripts,
                    fallbackContent = { resId ->
                        resources.openRawResource(resId).bufferedReader()
                            .use { it.readText() }
                    }
                )
        }
    }

    fun refresh(
        resources: Resources,
        settings: SettingsViewModel
    ) {
        clearScripts()
        loadScripts(resources, settings)
    }

    private fun clearScripts() {
        _scripts.value = null
    }
}