package io.github.andrewdongminyoo.singbridge

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertSame
import kotlin.test.assertTrue

class SongLibraryTest {
    @Test
    fun unreadyPlayerDoesNotCommitOrReplaceThePreviousSong() {
        assertRejectedPlayer(PlaybackSnapshot(isReady = false))
    }

    @Test
    fun failedPlayerDoesNotCommitEvenWhenItReportsReady() {
        assertRejectedPlayer(PlaybackSnapshot(isReady = true, error = "Decoder failed"))
    }

    private fun assertRejectedPlayer(snapshot: PlaybackSnapshot) {
        val previous = ImportTestPlayer()
        var releases = 0
        var saves = 0
        val candidate = object : AudioPlayer {
            override fun snapshot() = snapshot
            override fun play() = Unit
            override fun pause() = Unit
            override fun seekTo(positionMs: Long) = Unit
            override fun release() {
                releases++
            }
        }
        val library = SongLibrary(previous)
        library.selectAudio(ImportedAudio("Candidate", "file:candidate", 10_000) {})
        library.completeImport("[00:01]Hello", {
            saves++
            null
        }) { candidate }
        assertEquals(0, saves)
        assertSame(previous, library.song.player)
        assertFalse(previous.released)
        assertEquals(1, releases)
        assertNotNull(library.pendingAudio)
        assertNotNull(library.error)
    }

    @Test
    fun returningToSampleClearsDraftLeftByFailedRestore() {
        var disposed = false
        val library = SongLibrary(ImportTestPlayer())
        library.selectAudio(ImportedAudio("Saved", "file:saved", 10_000) { disposed = true })
        library.completeImport("broken") { error("Invalid LRC must not create player") }
        library.useSample(ImportTestPlayer())
        assertNull(library.pendingAudio)
        assertTrue(disposed)
        assertNull(library.error)
    }

    @Test
    fun storageFailureKeepsPreviousSongAndReleasesCandidatePlayer() {
        val original = ImportTestPlayer()
        val candidate = ImportTestPlayer()
        val library = SongLibrary(original)
        library.openImport()
        library.selectAudio(ImportedAudio("Song", "file:test", 10_000) {})
        library.completeImport("[00:01]Hello", { "Storage full" }) { candidate }
        assertSame(original, library.song.player)
        assertFalse(original.released)
        assertTrue(candidate.released)
        assertEquals("Storage full", library.error)
        assertNotNull(library.pendingAudio)
    }

    @Test
    fun invalidLyricsKeepPreviousSongAndAllowRetryWithoutCreatingPlayer() {
        val original = ImportTestPlayer()
        original.play()
        val library = SongLibrary(original)
        library.openImport()
        library.selectAudio(ImportedAudio("Song.wav", "file:test", 10_000) {})
        library.completeImport("broken") { error("Must not create a player") }
        assertSame(original, library.song.player)
        assertFalse(original.released)
        assertFalse(original.playing)
        assertTrue(library.importOpen)
        assertNotNull(library.error)
        val imported = ImportTestPlayer()
        library.completeImport("[00:01]Hello") { imported }
        assertSame(imported, library.song.player)
        assertTrue(original.released)
        assertEquals(10_000, library.song.track.durationMs)
        assertEquals("Song.wav", library.song.title)
        assertFalse(library.importOpen)
        assertFalse(imported.playing)
    }

    @Test
    fun cancellationDisposesDraftButNotCurrentSong() {
        var disposed = 0
        val original = ImportTestPlayer()
        val library = SongLibrary(original)
        library.openImport()
        library.selectAudio(ImportedAudio("Song", "file:test", 10_000) { disposed++ })
        library.cancelImport()
        assertEquals(1, disposed)
        assertSame(original, library.song.player)
        assertFalse(original.released)
        assertNull(library.pendingAudio)
        library.cancelImport()
        assertEquals(1, disposed)
    }

    @Test
    fun replacementAndReturnToSampleReleaseOwnedResourcesExactlyOnce() {
        var firstDisposed = 0
        var secondDisposed = 0
        val library = SongLibrary(ImportTestPlayer())
        library.openImport()
        library.selectAudio(ImportedAudio("First", "file:one", 10_000) { firstDisposed++ })
        library.selectAudio(ImportedAudio("Second", "file:two", 10_000) { secondDisposed++ })
        assertEquals(1, firstDisposed)
        val imported = ImportTestPlayer()
        library.completeImport("[00:01]Hello") { imported }
        assertEquals(0, secondDisposed)
        val sample = ImportTestPlayer()
        library.useSample(sample)
        assertTrue(imported.released)
        assertEquals(1, secondDisposed)
        assertSame(sampleTrack, library.song.track)
        library.release()
        library.release()
        assertEquals(1, sample.releaseCount)
        assertEquals(1, secondDisposed)
    }

    @Test
    fun factoryFailureKeepsBothCurrentSongAndRetryableDraft() {
        val original = ImportTestPlayer()
        val library = SongLibrary(original)
        library.openImport()
        library.selectAudio(ImportedAudio("Song", "file:test", 10_000) {})
        library.completeImport("[00:01]Hello") { throw IllegalStateException("decoder") }
        assertSame(original, library.song.player)
        assertFalse(original.released)
        assertNotNull(library.pendingAudio)
        assertNotNull(library.error)
    }
}

private class ImportTestPlayer : AudioPlayer {
    var playing = false
    var releaseCount = 0
    val released get() = releaseCount > 0
    override fun snapshot() = PlaybackSnapshot(isReady = true, isPlaying = playing)
    override fun play() { playing = true }
    override fun pause() { playing = false }
    override fun seekTo(positionMs: Long) = Unit
    override fun release() { releaseCount++ }
}
