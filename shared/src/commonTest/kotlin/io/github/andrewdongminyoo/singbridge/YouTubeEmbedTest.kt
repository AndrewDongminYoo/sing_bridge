package io.github.andrewdongminyoo.singbridge

import kotlin.test.Test
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class YouTubeEmbedTest {
    @Test
    fun usesInstalledAppIdentityAndRejectsHtmlInjection() {
        val html = youtubeEmbedHtml("io.github.andrewdongminyoo.singbridge")
        assertTrue(html.contains("origin: 'https://io.github.andrewdongminyoo.singbridge'"))
        assertFalse(html.contains("__APP_ORIGIN__"))
        assertFailsWith<IllegalArgumentException> { youtubeEmbedHtml("app';alert(1)//") }
        assertFailsWith<IllegalArgumentException> { youtubeEmbedHtml("") }
    }
}
