package io.github.andrewdongminyoo.singbridge

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import kotlin.test.assertTrue

class LrcParserTest {
    @Test
    fun sortsRepeatedTimestampsAndPreservesUnicodeWithoutInventingPronunciation() {
        val track = parseLrc("\uFEFF[ti:Practice]\r\n[00:04.125]안녕\r\n[00:01.50][00:06]朝の風", 8_000)
        assertEquals(listOf(1_500L, 4_125L, 6_000L), track.lines.map { it.startMs })
        assertEquals(listOf(4_125L, 6_000L, 8_000L), track.lines.map { it.endMs })
        assertEquals(listOf("朝の風", "안녕", "朝の風"), track.lines.map { it.original })
        assertTrue(track.lines.all { it.pronunciation.isEmpty() })
    }

    @Test
    fun combinesSimultaneousLyricsAndHonorsEmptyEndMarkers() {
        val track = parseLrc("[00:01]Hello\n[00:01]안녕\n[00:03]\n[00:05]Again\n[00:08]", 8_000)
        assertEquals("Hello\n안녕", track.lines[0].original)
        assertEquals(3_000, track.lines[0].endMs)
        assertNull(track.activeLineAt(3_000))
        assertNull(track.activeLineAt(4_999))
        assertEquals(1, track.activeLineAt(5_000))
    }

    @Test
    fun rejectsInputThatWouldSilentlyLoseTiming() {
        listOf(
            "plain lyrics", "[00:60]wrong", "[00:01.1]wrong", "[00:01.1234]wrong",
            "[offset:100]\n[00:01]shifted", "[00:01]<00:01.20>enhanced",
            "[00:01]valid\ninvalid", "[00:10]outside", "[00:08]at end", "[00:01]",
        ).forEach { text ->
            assertFailsWith<IllegalArgumentException>(text) { parseLrc(text, 8_000) }
        }
    }

    @Test
    fun acceptsSignedAndPaddedZeroOffsetsWithoutMovingLyrics() {
        listOf("0", "+0", "-0", "000", "+000", "-000").forEach { offset ->
            val track = parseLrc("[offset:$offset]\n[00:01]Start", 2_000)
            assertEquals(1_000L, track.lines.single().startMs)
        }
        listOf("+1", "-1", "001", "", "zero", "0.0", "99999999999999999999").forEach { offset ->
            assertFailsWith<IllegalArgumentException>(offset) {
                parseLrc("[offset:$offset]\n[00:01]Start", 2_000)
            }
        }
    }

    @Test
    fun acceptsMetadataAndZeroOffsetButRejectsInvalidDurationAndOversizedInput() {
        assertEquals(1, parseLrc("[ar:Artist]\n[offset:0]\n[00:00]Start", 1_000).lines.size)
        assertFailsWith<IllegalArgumentException> { parseLrc("[00:00]Start", 0) }
        assertFailsWith<IllegalArgumentException> { parseLrc("a".repeat(1_048_577), 1_000) }
        assertFailsWith<IllegalArgumentException> { parseLrc("[00:00]" + "가".repeat(349_524), 1_000) }
        assertFailsWith<IllegalArgumentException> { parseLrc("[00:00]".repeat(10_001) + "Start", 1_000) }
    }
}
