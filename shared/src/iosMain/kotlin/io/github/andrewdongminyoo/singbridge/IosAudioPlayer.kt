@file:OptIn(kotlinx.cinterop.ExperimentalForeignApi::class)

package io.github.andrewdongminyoo.singbridge

import platform.AVFAudio.AVAudioSession
import platform.AVFAudio.AVAudioSessionCategoryPlayback
import platform.AVFAudio.setActive
import platform.AVFoundation.AVPlayer
import platform.AVFoundation.AVPlayerItemStatusReadyToPlay
import platform.AVFoundation.currentItem
import platform.AVFoundation.currentTime
import platform.AVFoundation.pause
import platform.AVFoundation.play
import platform.AVFoundation.rate
import platform.AVFoundation.replaceCurrentItemWithPlayerItem
import platform.AVFoundation.seekToTime
import platform.CoreMedia.CMTimeGetSeconds
import platform.CoreMedia.CMTimeMake
import platform.Foundation.NSURL

class IosAudioPlayer(uri: String, private val durationMs: Long) : AudioPlayer {
    constructor() : this(sampleAudioUri(), sampleTrack.durationMs)

    private val player = AVPlayer.playerWithURL(requireNotNull(NSURL.URLWithString(uri)))
    private val audioSession = AVAudioSession.sharedInstance()
    private var sessionError: String? = null
    private var pendingPosition: Long? = null
    private var seekGeneration = 0

    override fun snapshot(): PlaybackSnapshot {
        val seconds = CMTimeGetSeconds(player.currentTime())
        val position = pendingPosition ?: if (seconds.isFinite()) (seconds * 1000).toLong() else 0
        val item = player.currentItem
        return PlaybackSnapshot(
            positionMs = position.coerceAtLeast(0),
            isPlaying = player.rate > 0,
            isReady = item?.status == AVPlayerItemStatusReadyToPlay,
            hasEnded = pendingPosition == null && position >= durationMs,
            error = sessionError ?: item?.error?.let {
                "음원을 재생할 수 없습니다. 다른 파일이나 샘플곡을 선택해 주세요."
            },
        )
    }

    override fun play() {
        val categorySet = audioSession.setCategory(AVAudioSessionCategoryPlayback, error = null)
        val activated = categorySet && audioSession.setActive(true, error = null)
        if (!activated) {
            sessionError = "오디오를 사용할 수 없습니다. 앱을 다시 열어 주세요."
            return
        }
        player.play()
    }

    override fun pause() {
        player.pause()
    }

    override fun seekTo(positionMs: Long) {
        pendingPosition = positionMs
        val generation = ++seekGeneration
        player.seekToTime(
            CMTimeMake(positionMs, 1000),
            toleranceBefore = CMTimeMake(0, 1000),
            toleranceAfter = CMTimeMake(0, 1000),
        ) {
            if (generation == seekGeneration) pendingPosition = null
        }
    }

    override fun release() {
        player.pause()
        player.replaceCurrentItemWithPlayerItem(null)
        audioSession.setActive(false, error = null)
    }
}
