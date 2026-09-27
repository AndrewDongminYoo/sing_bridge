package io.github.andrewdongminyoo.singbridge

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class PracticeSessionTest {
    private val track = PracticeTrack(
        12_000,
        listOf(
            LyricLine("one", 1_000, 4_000, "こんにちは", "곤니치와"),
            LyricLine("two", 5_000, 8_000, "ありがとう", "아리가토오"),
            LyricLine("three", 8_000, 12_000, "またね", "마타네"),
        ),
    )

    @Test
    fun highlightsOnlyInsideHalfOpenLineIntervals() {
        assertNull(track.activeLineAt(999))
        assertEquals(0, track.activeLineAt(1_000))
        assertEquals(0, track.activeLineAt(3_999))
        assertNull(track.activeLineAt(4_000))
        assertEquals(2, track.activeLineAt(8_000))
        assertNull(track.activeLineAt(12_000))
    }

    @Test
    fun rejectsInvalidTimelines() {
        assertFailsWith<IllegalArgumentException> { PracticeTrack(0, emptyList()) }
        assertFailsWith<IllegalArgumentException> { PracticeTrack(12_000, emptyList()) }
        assertFailsWith<IllegalArgumentException> {
            PracticeTrack(12_000, listOf(track.lines[0], track.lines[0]))
        }
        assertFailsWith<IllegalArgumentException> {
            PracticeTrack(2_000, listOf(track.lines[0]))
        }
    }

    @Test
    fun selectingLineSeeksWithoutStartingPausedAudio() {
        val player = TestPlayer()
        val session = PracticeSession(track, player)
        session.selectLine(1)
        assertEquals(1, session.selectedLine)
        assertEquals(5_000, player.snapshot().positionMs)
        assertFalse(player.snapshot().isPlaying)
        assertFailsWith<IllegalArgumentException> { session.selectLine(-1) }
        assertEquals(1, session.selectedLine)
    }

    @Test
    fun repeatRestartsTheSelectedLineAtItsEnd() {
        val player = TestPlayer()
        val session = PracticeSession(track, player)
        session.selectLine(1)
        session.toggleRepeat()
        player.current = PlaybackSnapshot(8_000, isPlaying = true, isReady = true)
        val result = session.poll()
        assertEquals(5_000, result.positionMs)
        assertTrue(result.isPlaying)
        assertEquals(1, session.selectedLine)
    }

    @Test
    fun repeatDoesNotSeekWhilePaused() {
        val player = TestPlayer()
        val session = PracticeSession(track, player)
        session.toggleRepeat()
        player.current = PlaybackSnapshot(5_000, isReady = true)
        assertEquals(5_000, session.poll().positionMs)
    }

    @Test
    fun repeatingLastLineRestartsAfterNativePlaybackEnds() {
        val player = TestPlayer()
        val session = PracticeSession(track, player)
        session.selectLine(2)
        session.toggleRepeat()
        session.togglePlayback()
        player.current = PlaybackSnapshot(12_000, isReady = true, hasEnded = true)
        assertEquals(8_000, session.poll().positionMs)
        assertTrue(player.snapshot().isPlaying)
    }

    @Test
    fun playRestartsFinishedTrackAndPausePreservesPosition() {
        val player = TestPlayer()
        val session = PracticeSession(track, player)
        player.current = PlaybackSnapshot(12_000, isReady = true)
        session.togglePlayback()
        assertEquals(0, player.snapshot().positionMs)
        assertTrue(player.snapshot().isPlaying)
        player.current = PlaybackSnapshot(2_500, isPlaying = true, isReady = true)
        session.togglePlayback()
        assertEquals(2_500, player.snapshot().positionMs)
        assertFalse(player.snapshot().isPlaying)
    }

    @Test
    fun seekingClampsToTrackAndDisablesRepeat() {
        val player = TestPlayer()
        val session = PracticeSession(track, player)
        session.toggleRepeat()
        session.seekTo(99_000)
        assertEquals(12_000, player.snapshot().positionMs)
        assertFalse(session.repeatEnabled)
        session.seekTo(-1)
        assertEquals(0, player.snapshot().positionMs)
    }

    @Test
    fun hidingAndRevealingDoesNotChangePlayback() {
        val player = TestPlayer()
        val session = PracticeSession(track, player)
        player.current = PlaybackSnapshot(3_000, isPlaying = true, isReady = true)
        session.toggleLyrics()
        assertTrue(session.lyricsHidden)
        session.toggleLyrics()
        assertFalse(session.lyricsHidden)
        assertEquals(3_000, player.snapshot().positionMs)
        assertTrue(player.snapshot().isPlaying)
    }

    @Test
    fun leavingPracticeAtTrackEndDoesNotRestartRepeat() {
        val player = TestPlayer()
        val session = PracticeSession(track, player)
        session.selectLine(2)
        session.toggleRepeat()
        player.current = PlaybackSnapshot(12_000, isReady = true, hasEnded = true)
        session.leavePractice()
        val snapshot = session.poll()
        assertFalse(snapshot.isPlaying)
        assertEquals(12_000, snapshot.positionMs)
    }

    @Test
    fun playDoesNothingWhenAudioIsUnavailable() {
        val player = TestPlayer()
        val session = PracticeSession(track, player)
        player.current = PlaybackSnapshot(error = "unavailable")
        session.togglePlayback()
        assertFalse(player.snapshot().isPlaying)
    }
}

private class TestPlayer : AudioPlayer {
    var current = PlaybackSnapshot(isReady = true)
    override fun snapshot() = current
    override fun play() {
        current = current.copy(isPlaying = true)
    }
    override fun pause() {
        current = current.copy(isPlaying = false)
    }
    override fun seekTo(positionMs: Long) {
        current = current.copy(positionMs = positionMs, hasEnded = false)
    }
    override fun release() = Unit
}
