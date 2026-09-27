package io.github.andrewdongminyoo.singbridge

data class LyricLine(
    val id: String,
    val startMs: Long,
    val endMs: Long,
    val original: String,
    val pronunciation: String,
)

data class PracticeTrack(val durationMs: Long, val lines: List<LyricLine>) {
    init {
        require(durationMs > 0 && lines.isNotEmpty())
        require(lines.map { it.id }.distinct().size == lines.size)
        lines.forEachIndexed { index, line ->
            require(line.startMs >= 0 && line.endMs > line.startMs)
            require(line.endMs <= durationMs)
            require(index == 0 || lines[index - 1].endMs <= line.startMs)
        }
    }

    fun activeLineAt(positionMs: Long): Int? = lines.indexOfFirst {
        positionMs >= it.startMs && positionMs < it.endMs
    }.takeIf { it >= 0 }
}

class PracticeSession(val track: PracticeTrack, private val player: AudioPlayer) {
    var selectedLine: Int = 0
        private set
    var repeatEnabled: Boolean = false
        private set
    var lyricsHidden: Boolean = false
        private set

    fun poll(): PlaybackSnapshot {
        val playback = player.snapshot()
        val line = track.lines[selectedLine]
        if (repeatEnabled && playback.isReady &&
            (playback.isPlaying || playback.hasEnded) &&
            (playback.positionMs < line.startMs || playback.positionMs >= line.endMs)
        ) {
            player.seekTo(line.startMs)
            if (playback.hasEnded) player.play()
            return player.snapshot()
        }
        return playback
    }

    fun selectLine(index: Int) {
        require(index in track.lines.indices)
        selectedLine = index
        player.seekTo(track.lines[index].startMs)
    }

    fun toggleRepeat() {
        repeatEnabled = !repeatEnabled
        if (repeatEnabled) {
            val line = track.lines[selectedLine]
            val position = player.snapshot().positionMs
            if (position < line.startMs || position >= line.endMs) {
                player.seekTo(line.startMs)
            }
        }
    }

    fun toggleLyrics() {
        lyricsHidden = !lyricsHidden
    }

    fun leavePractice() {
        repeatEnabled = false
        player.pause()
    }

    fun togglePlayback() {
        val playback = player.snapshot()
        if (!playback.isReady || playback.error != null) return
        if (playback.isPlaying) {
            player.pause()
            return
        }
        val line = track.lines[selectedLine]
        if (repeatEnabled &&
            (playback.positionMs < line.startMs || playback.positionMs >= line.endMs)
        ) {
            player.seekTo(line.startMs)
        } else if (playback.hasEnded || playback.positionMs >= track.durationMs) {
            player.seekTo(0)
        }
        player.play()
    }

    fun seekTo(positionMs: Long) {
        repeatEnabled = false
        player.seekTo(positionMs.coerceIn(0, track.durationMs))
    }
}
