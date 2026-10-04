package com.ycngmn.nobook.utils

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class MessengerLinksTest {
    private val messages = MessengerLinks.MESSAGES_URL

    @Test
    fun messengerHostsAndSchemesMapToMessages() {
        assertEquals(messages, MessengerLinks.toInternalUrl("https://www.messenger.com/"))
        assertEquals(messages, MessengerLinks.toInternalUrl("https://messenger.com/t/123"))
        assertEquals(messages, MessengerLinks.toInternalUrl("fb-messenger://user-thread/123"))
        assertEquals(
            messages,
            MessengerLinks.toInternalUrl("intent://user/1#Intent;scheme=fb;package=com.facebook.orca;end")
        )
    }

    @Test
    fun mDotMeKeepsTheThread() {
        assertEquals("https://www.facebook.com/messages/t/john.doe", MessengerLinks.toInternalUrl("https://m.me/john.doe"))
        assertEquals(messages, MessengerLinks.toInternalUrl("https://m.me/"))
    }

    @Test
    fun mobileMessagesPathsMoveToTheDesktopHost() {
        assertEquals(
            "https://www.facebook.com/messages/t/42?x=1",
            MessengerLinks.toInternalUrl("https://m.facebook.com/messages/t/42?x=1")
        )
        assertEquals("https://www.facebook.com/messages", MessengerLinks.toInternalUrl("https://touch.facebook.com/messages"))
    }

    @Test
    fun alreadyInternalMessagesUrlIsReturnedUnchanged() {
        val url = "https://www.facebook.com/messages/t/42"
        assertEquals(url, MessengerLinks.toInternalUrl(url))
    }

    @Test
    fun otherLinksAreNotMessenger() {
        assertNull(MessengerLinks.toInternalUrl("https://www.facebook.com/photo?fbid=1"))
        assertNull(MessengerLinks.toInternalUrl("https://m.facebook.com/messagesfoo"))
        assertNull(MessengerLinks.toInternalUrl("https://example.com/messages/"))
        assertNull(MessengerLinks.toInternalUrl("not a url"))
    }

    @Test
    fun desktopSiteOnlyForMessagesPages() {
        assertTrue(MessengerLinks.needsDesktopSite("https://www.facebook.com/messages/t/42"))
        assertTrue(MessengerLinks.needsDesktopSite("https://m.facebook.com/messages"))
        assertFalse(MessengerLinks.needsDesktopSite("https://m.facebook.com/"))
        assertFalse(MessengerLinks.needsDesktopSite("https://example.com/messages/"))
        assertFalse(MessengerLinks.needsDesktopSite(null))
    }
}
