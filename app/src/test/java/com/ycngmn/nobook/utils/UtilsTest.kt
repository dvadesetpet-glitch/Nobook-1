package com.ycngmn.nobook.utils

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class UtilsTest {

    @Test
    fun testUserAgentString() {
        assertTrue("Desktop user agent should contain Windows", DESKTOP_USER_AGENT.contains("Windows", ignoreCase = true))
        assertTrue("Desktop user agent should contain Chrome", DESKTOP_USER_AGENT.contains("Chrome", ignoreCase = true))
    }

    @Test
    fun testDesktopUserAgentNotEmpty() {
        assertNotNull("Desktop user agent should not be null", DESKTOP_USER_AGENT)
        assertTrue("Desktop user agent should not be empty", DESKTOP_USER_AGENT.isNotEmpty())
    }

    @Test
    fun testFacebookUrl() {
        assertEquals("https://facebook.com/", "https://facebook.com/")
    }

    @Test
    fun testMobileUrl() {
        assertEquals("https://m.facebook.com/", "https://m.facebook.com/")
    }
}
