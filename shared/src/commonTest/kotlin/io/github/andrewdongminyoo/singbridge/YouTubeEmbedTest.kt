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

    @Test
    fun searchConfigurationDoesNotLeakIntoUnreplacedMarkup() {
        val html = buildYoutubeEmbedHtml("io.github.andrewdongminyoo.singbridge", "fixture-key")
        assertTrue(html.contains("const youtubeApiKey = 'fixture-key'"))
        assertTrue(html.contains("id=\"song-search\""))
        assertFalse(html.contains("__SEARCH__"))
        assertFalse(html.contains("__LYRICS__"))
        assertFalse(html.contains("__YOUTUBE_API_KEY__"))
        assertTrue(
            buildYoutubeEmbedHtml("io.github.andrewdongminyoo.singbridge", "").contains("const youtubeApiKey = ''"),
        )
        assertFailsWith<IllegalArgumentException> {
            buildYoutubeEmbedHtml("io.github.andrewdongminyoo.singbridge", "';alert(1)//")
        }
    }
}
