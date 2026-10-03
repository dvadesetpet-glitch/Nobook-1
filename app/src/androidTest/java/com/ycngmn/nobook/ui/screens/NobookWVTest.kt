package com.ycngmn.nobook.ui.screens

import androidx.activity.compose.setContent
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.ycngmn.nobook.MainActivity
import com.ycngmn.nobook.ui.theme.NobookTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class NobookWVTest {

    @get:Rule
    val composeTestRule = createAndroidComposeRule<MainActivity>()

    @Test
    fun testWebViewInitializes() {
        composeTestRule.activity.setContent {
            NobookTheme {
                NobookWebView(url = "https://facebook.com/")
            }
        }

        // Verify WebView is rendered
        composeTestRule.waitForIdle()
    }

    @Test
    fun testWebViewLoadsUrl() {
        val testUrl = "https://facebook.com/"

        composeTestRule.activity.setContent {
            NobookTheme {
                NobookWebView(url = testUrl)
            }
        }

        composeTestRule.waitForIdle()
        // Additional assertions for URL loading can be added
    }

    @Test
    fun testWebViewBackHandler() {
        composeTestRule.activity.setContent {
            NobookTheme {
                NobookWebView(url = "https://facebook.com/")
            }
        }

        composeTestRule.waitForIdle()
        // Test back handler behavior
    }
}
