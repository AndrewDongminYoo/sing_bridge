package io.github.andrewdongminyoo.singbridge

data class PlaybackSnapshot(
    val positionMs: Long = 0,
    val isPlaying: Boolean = false,
    val isReady: Boolean = false,
    val hasEnded: Boolean = false,
    val error: String? = null,
)

interface AudioPlayer {
    fun snapshot(): PlaybackSnapshot
    fun play()
    fun pause()
    fun seekTo(positionMs: Long)
    fun release()
}
