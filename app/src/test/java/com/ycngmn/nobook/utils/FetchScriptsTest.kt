package com.ycngmn.nobook.utils

import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FetchScriptsTest {
    @Test
    fun forkOnlyScriptsUseBundledCopyInOrderWithoutNetwork() = runBlocking {
        val scripts = listOf(
            Script(true, 1, "a.js", fetchRemote = false),
            Script(false, 2, "b.js", fetchRemote = false),
            Script(true, 3, "c.js", fetchRemote = false)
        )

        val out = fetchScripts(scripts) { id -> "var s$id = $id;" }

        assertTrue(out.startsWith("if (!window.__nobookBundle) {"))
        assertTrue(out.indexOf("var s1") in 0 until out.indexOf("var s3"))
        assertFalse(out.contains("var s2"))
    }
}
