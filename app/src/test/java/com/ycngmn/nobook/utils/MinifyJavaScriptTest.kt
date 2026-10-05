package com.ycngmn.nobook.utils

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class MinifyJavaScriptTest {
    @Test
    fun keepsUrlsInStrings() {
        val out = minifyJavaScript("const u = 'https://example.com/a'; // note")
        assertEquals("const u = 'https://example.com/a';", out)
    }

    @Test
    fun keepsNewlinesForAsi() {
        val out = minifyJavaScript("let a = 1\nlet b = 2")
        assertEquals("let a = 1\nlet b = 2", out)
    }

    @Test
    fun keepsSpacesInStringsAndTemplates() {
        val src = "x = 'a   b'; y = `c   \${d}   e`;"
        assertEquals(src, minifyJavaScript(src))
    }

    @Test
    fun stripsBlockAndLineComments() {
        val out = minifyJavaScript("/* hi\nthere */ a(); // x\n\n  b();")
        assertFalse(out.contains("hi"))
        assertTrue(out.contains("a();") && out.contains("b();"))
    }

    @Test
    fun keepsRegexWithSlashesAndQuotes() {
        val src = """r = /https?:\/\/[^'"]+/g; s = a / b;"""
        assertEquals(src, minifyJavaScript(src))
    }

    @Test
    fun wrapBundleRunsOncePerDocumentInsideItsOwnScope() {
        val out = wrapBundle("const observer = 1;")
        assertTrue(out.startsWith("if (!window.__nobookBundle) {"))
        assertTrue(out.contains("window.__nobookBundle = true;"))
        assertTrue(out.contains("(function() {\nconst observer = 1;\n})();"))
    }

    @Test
    fun isolateScriptCatchesErrorsPerScript() {
        val out = isolateScript("a.js", "throw new Error('x')")
        assertTrue(out.startsWith("try {\nthrow new Error('x')\n}"))
        assertTrue(out.contains("catch (e)"))
        assertTrue(out.contains("a.js"))
    }
}
