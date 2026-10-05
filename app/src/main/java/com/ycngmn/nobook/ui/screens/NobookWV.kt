package com.ycngmn.nobook.ui.screens

import android.content.Intent
import android.view.View
import android.webkit.CookieManager
import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.activity.compose.LocalActivity
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBars
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalResources
import androidx.compose.ui.unit.dp
import androidx.core.graphics.ColorUtils
import androidx.core.net.toUri
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import androidx.lifecycle.viewmodel.compose.viewModel
import com.multiplatform.webview.web.LoadingState
import com.multiplatform.webview.web.WebView
import com.multiplatform.webview.web.rememberWebViewState
import com.multiplatform.webview.web.rememberWebViewNavigator
import com.ycngmn.nobook.R
import com.ycngmn.nobook.ui.components.NetworkErrorDialog
import com.ycngmn.nobook.ui.components.settings.SettingsDialog
import com.ycngmn.nobook.ui.viewmodel.AccountViewModel
import com.ycngmn.nobook.ui.viewmodel.MainViewModel
import com.ycngmn.nobook.ui.viewmodel.SettingsViewModel
import com.ycngmn.nobook.ui.viewmodel.WatchHistoryViewModel
import com.ycngmn.nobook.utils.DESKTOP_USER_AGENT
import com.ycngmn.nobook.utils.MessengerLinks
import com.ycngmn.nobook.utils.ExternalRequestInterceptor
import com.ycngmn.nobook.utils.fileChooserWebViewParams
import com.ycngmn.nobook.utils.jsBridge.AdFilteringBridge
import com.ycngmn.nobook.utils.jsBridge.ClipboardBridge
import com.ycngmn.nobook.utils.jsBridge.DownloadBridge
import com.ycngmn.nobook.utils.jsBridge.NobookSettings
import com.ycngmn.nobook.utils.jsBridge.ScreenBridge
import com.ycngmn.nobook.utils.jsBridge.ThemeChange
import com.ycngmn.nobook.utils.jsBridge.WatchHistoryBridge
import com.ycngmn.nobook.utils.rememberAutoDesktop
import com.ycngmn.nobook.utils.rememberImeHeight
import kotlinx.coroutines.delay

private const val HOME_URL = "https://m.facebook.com/"

private const val EARLY_STYLE_JS =
    "(function(){var s=document.createElement('style');" +
        "s.textContent='[role=\"button\"][aria-label=\"Facebook logo\" i] img{visibility:hidden}';" +
        "(document.head||document.documentElement).appendChild(s);})();"

@Composable
fun NobookWebView(
    url: String,
    settingsVM: SettingsViewModel = viewModel()
) {
    val context = LocalContext.current
    val activity = LocalActivity.current
    val resources = LocalResources.current

    // Not rememberSaveableWebViewState: it puts the whole WebView back-stack (~770 KB) into the
    // saved instance state and crashes with TransactionTooLargeException when the app is stopped.
    val state = rememberWebViewState(url)

    // Messenger only works in the desktop layout, so the user agent follows the page being opened.
    val desktopSetting by rememberUpdatedState(settingsVM.desktopLayout.collectAsState().value)
    var appliedUserAgent by remember { mutableStateOf<String?>(null) }
    fun applyUserAgent(forUrl: String?) {
        val ua = if (desktopSetting || MessengerLinks.needsDesktopSite(forUrl)) DESKTOP_USER_AGENT else ""
        if (ua != appliedUserAgent) {
            state.nativeWebView.settings.userAgentString = ua
            appliedUserAgent = ua
        }
    }

    val navigator = rememberWebViewNavigator(
        requestInterceptor = ExternalRequestInterceptor(
            onMainFrameUrl = { applyUserAgent(it) },
            handleExternalUrl = { externalUrl ->
                val intent = Intent(Intent.ACTION_VIEW, externalUrl.toUri())
                runCatching {
                    context.startActivity(intent)
                }.onFailure {
                    Toast.makeText(
                        context,
                        resources.getString(R.string.not_supported),
                        Toast.LENGTH_SHORT
                    ).show()
                }
            }
        )
    )

    LaunchedEffect(navigator) {
        val bundle = state.viewState
        if (bundle == null) {
            navigator.loadUrl(url)
        }
    }

    // A link opened while Nobook is already running arrives as a new `url` (singleTask + onNewIntent).
    var firstUrl by remember { mutableStateOf(true) }
    LaunchedEffect(url) {
        if (firstUrl) firstUrl = false else navigator.loadUrl(url)
    }

    // Leaving Messenger always goes straight to the feed. History-back was unreliable there: the
    // previous entry could be another Messenger page, which put the user back in the chat.
    // loadUrl() does not pass through the request interceptor, so the mobile user agent is set first.
    fun leaveMessenger() {
        applyUserAgent(HOME_URL)
        navigator.loadUrl(HOME_URL)
    }

    var settingsToggle by rememberSaveable { mutableStateOf(false) }
    var showWatchHistory by rememberSaveable { mutableStateOf(false) }
    var showAccountManagement by rememberSaveable { mutableStateOf(false) }

    // allow exiting while scrolling to top.
    var exitScroll by remember { mutableStateOf(false) }
    BackHandler {
        if (MessengerLinks.needsDesktopSite(state.lastLoadedUrl)) {
            // Messenger's own page swallows back presses (open menus/dialogs): leave it directly.
            leaveMessenger()
        } else if (exitScroll) {
            activity?.finish()
        } else {
            navigator.evaluateJavaScript("backHandlerNB();") {
                val backHandled = it.removeSurrounding("\"")
                when (backHandled) {
                    "false" -> {
                        if (navigator.canGoBack) {
                            navigator.navigateBack()
                        } else {
                            activity?.finish()
                        }
                    }
                    "exit" -> activity?.finish()
                    "scrolling" -> exitScroll = true
                }
            }
        }
    }

    // Overlay screens must close on back instead of navigating the page / exiting the app.
    BackHandler(enabled = showWatchHistory || showAccountManagement) {
        showWatchHistory = false
        showAccountManagement = false
    }

    LaunchedEffect(exitScroll) {
        if (exitScroll) {
            delay(800)
            exitScroll = false
        }
    }

    val isDesktop by settingsVM.desktopLayout.collectAsState()
    val isAutoRevert by settingsVM.isRevertDesktop.collectAsState()
    val isAutoDesktop = rememberAutoDesktop()

    LaunchedEffect(Unit) {
        if (isAutoDesktop && !isDesktop) {
            settingsVM.setRevertDesktop(true)
            settingsVM.setDesktopLayout(true)
        }
        else if (!isAutoDesktop && isAutoRevert) {
            settingsVM.setRevertDesktop(false)
            settingsVM.setDesktopLayout(false)
        }
    }

    var isLoading by rememberSaveable { mutableStateOf(true) }
    val isError = state.errorsForCurrentRequest.lastOrNull()?.isFromMainFrame == true

    val viewModel: MainViewModel = viewModel {
        MainViewModel(
            resources = resources,
            settings = settingsVM
        )
    }

    val watchHistoryVM: WatchHistoryViewModel = viewModel(factory = WatchHistoryViewModel.Factory(context))
    val accountVM: AccountViewModel = viewModel(factory = AccountViewModel.Factory(context))

    val themeColor by viewModel.themeColor
    // Manual handling to fix visual & padding bug on settings dialog.
    var isImmersiveMode by rememberSaveable { mutableStateOf(settingsVM.immersiveMode.value) }

    fun setWindow(immersive: Boolean) {
        val window = activity?.window ?: return
        val windowInsetsController = WindowInsetsControllerCompat(window, window.decorView)

        if (immersive) {
            windowInsetsController.hide(WindowInsetsCompat.Type.systemBars())
            windowInsetsController.systemBarsBehavior =
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        } else {
            val isLight = ColorUtils.calculateLuminance(themeColor.toArgb()) > 0.5
            windowInsetsController.show(WindowInsetsCompat.Type.systemBars())
            windowInsetsController.isAppearanceLightStatusBars = isLight
            windowInsetsController.isAppearanceLightNavigationBars = isLight
        }
        isImmersiveMode = immersive
    }

    LaunchedEffect(isImmersiveMode, themeColor.value) {
        setWindow(isImmersiveMode)
    }

    val userScripts by viewModel.scripts
    val loadingState = state.loadingState

    LaunchedEffect(loadingState, userScripts) {
        if (loadingState is LoadingState.Finished) {
            userScripts?.let { scripts ->
                navigator.evaluateJavaScript(scripts) {
                    isLoading = false
                }
            }
        }
    }

    if (isError && isLoading) {
        NetworkErrorDialog { activity?.finish() }
        return
    }

    if (isLoading) {
        SplashLoading(
            if (loadingState is LoadingState.Loading) {
                loadingState.progress
            } else {
                0.8F
            }
        )
    }


    LaunchedEffect(isDesktop) {
        applyUserAgent(state.lastLoadedUrl)
    }

    // Back/forward do not go through the request interceptor: when the page changes to or from
    // Messenger, switch the user agent and reload so the right layout is served.
    LaunchedEffect(state.lastLoadedUrl) {
        val before = appliedUserAgent
        applyUserAgent(state.lastLoadedUrl)
        if (before != null && appliedUserAgent != before) navigator.reload()
    }

    // needed to consume extra padding when keyboard is open
    val barsInsets = WindowInsets.systemBars.asPaddingValues()
    val imeHeight = rememberImeHeight()

    // Memory leak prevention: release the WebView when the composable is destroyed.
    // The cache is deliberately kept (clearCache(true) here wiped it on every close and made the
    // next start download everything again); history/form data die with destroy() anyway.
    DisposableEffect(Unit) {
        onDispose {
            state.nativeWebView?.let { webView ->
                webView.stopLoading()
                webView.removeAllViews()
                webView.destroy()
            }
        }
    }

    WebView(
        modifier = Modifier
            .fillMaxSize()
            .background(themeColor)
            .then(
                if (isImmersiveMode) {
                    Modifier.padding(bottom = imeHeight)
                } else {
                    Modifier.padding(
                        top = barsInsets.calculateTopPadding(),
                        bottom = maxOf(barsInsets.calculateBottomPadding(), imeHeight)
                    )
                }
            ),
        state = state,
        navigator = navigator,
        platformWebViewParams = fileChooserWebViewParams(),
        captureBackPresses = false,
        onCreated = { webView ->

            // Runs before the page's own scripts: hide the Facebook wordmark at once so it does
            // not flash before brand_logo.js (injected after load) swaps in the noBook text.
            if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
                runCatching {
                    WebViewCompat.addDocumentStartJavaScript(
                        webView,
                        EARLY_STYLE_JS,
                        setOf("https://*.facebook.com", "https://facebook.com")
                    )
                }
            }

            val cookieManager = CookieManager.getInstance()
            cookieManager.setAcceptCookie(true)
            cookieManager.setAcceptThirdPartyCookies(webView, true)
            cookieManager.flush()

            state.webSettings.apply {
                isJavaScriptEnabled = true

                androidWebSettings.apply {
                    //isDebugInspectorInfoEnabled = true
                    domStorageEnabled = true
                    hideDefaultVideoPoster = true
                    mediaPlaybackRequiresUserGesture = false
                }
            }

            // Enable cache for performance (~30% faster page loads)
            webView.settings.apply {
                cacheMode = android.webkit.WebSettings.LOAD_DEFAULT
                databaseEnabled = true
            }

            webView.apply {
                addJavascriptInterface(
                    NobookSettings { settingsToggle = true },
                    "SettingsBridge"
                )
                addJavascriptInterface(
                    ThemeChange { viewModel.setThemeColor(Color(it)) },
                    "ThemeBridge"
                )
                addJavascriptInterface(
                    DownloadBridge(context),
                    "DownloadBridge"
                )
                addJavascriptInterface(
                    ClipboardBridge(context),
                    "ClipboardBridge"
                )
                addJavascriptInterface(
                    WatchHistoryBridge(watchHistoryVM),
                    "WatchHistoryBridge"
                )
                addJavascriptInterface(
                    ScreenBridge(activity),
                    "ScreenBridge"
                )
                addJavascriptInterface(
                    AdFilteringBridge { viewModel.setBlockedAdCount(it) },
                    "AdFilteringBridge"
                )

                setLayerType(View.LAYER_TYPE_HARDWARE, null)

                overScrollMode = View.OVER_SCROLL_NEVER
                isVerticalScrollBarEnabled = false
                isHorizontalScrollBarEnabled = false

                settings.setSupportZoom(true)
                settings.builtInZoomControls = true
                settings.displayZoomControls = false
            }
        }
    )

    if (MessengerLinks.needsDesktopSite(state.lastLoadedUrl)) {
        Box(Modifier.fillMaxSize()) {
            IconButton(
                onClick = { leaveMessenger() },
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(top = barsInsets.calculateTopPadding() + 8.dp, start = 8.dp)
                    .background(Color(0xB3000000), CircleShape)
            ) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color.White)
            }
        }
    }

    if (showAccountManagement) {
        AccountManagementScreen(
            onBackClick = { showAccountManagement = false },
            onAccountSwitch = { accountId ->
                accountVM.refreshActiveAccount()
                navigator.reload()
            },
            viewModel = accountVM
        )
    } else if (showWatchHistory) {
        WatchHistoryScreen(
            onBackClick = { showWatchHistory = false },
            onItemClick = { url ->
                showWatchHistory = false
                navigator.loadUrl(url)
            },
            viewModel = watchHistoryVM
        )
    }

    // Was a bare call in the composition body: it re-ran on every recomposition, i.e. every toggle.
    LaunchedEffect(settingsToggle) {
        if (settingsToggle) setWindow(false)
    }

    if (settingsToggle) {
        SettingsDialog(
            themeColor = themeColor,
            blockedAdCount = viewModel.blockedAdCount.value,
            onDismiss = {
                setWindow(settingsVM.immersiveMode.value)
                settingsToggle = false
            },
            onReload = {
                isLoading = true
                viewModel.setThemeColor(Color.Transparent)
                setWindow(settingsVM.immersiveMode.value)
                viewModel.refresh(
                    resources = resources,
                    settings = settingsVM
                )
                navigator.reload()
            },
            onOpenWatchHistory = {
                settingsToggle = false
                showWatchHistory = true
            },
            onOpenAccountManagement = {
                settingsToggle = false
                showAccountManagement = true
            }
        )
    }
}
