package io.github.andrewdongminyoo.singbridge

import android.content.Context
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer

class AndroidAudioPlayer(context: Context) : AudioPlayer {
    private val player = ExoPlayer.Builder(context.applicationContext).build().apply {
        setAudioAttributes(
            AudioAttributes.Builder()
                .setUsage(C.USAGE_MEDIA)
                .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                .build(),
            true,
        )
        setHandleAudioBecomingNoisy(true)
        setMediaItem(MediaItem.fromUri(sampleAudioUri()))
        prepare()
    }

    override fun snapshot() = PlaybackSnapshot(
        positionMs = player.currentPosition.coerceAtLeast(0),
        isPlaying = player.isPlaying,
        isReady = player.playbackState == Player.STATE_READY ||
            player.playbackState == Player.STATE_ENDED,
        hasEnded = player.playbackState == Player.STATE_ENDED,
        error = player.playerError?.let { "샘플 음원을 재생할 수 없습니다. 앱을 다시 열어 주세요." },
    )

    override fun play() = player.play()
    override fun pause() = player.pause()
    override fun seekTo(positionMs: Long) = player.seekTo(positionMs)
    override fun release() = player.release()
}
