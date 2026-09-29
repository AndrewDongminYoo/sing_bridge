package io.github.andrewdongminyoo.singbridge

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

class ImportedAudio(val name: String, val uri: String, val durationMs: Long, val dispose: () -> Unit)

data class PracticeSong(val title: String, val track: PracticeTrack, val player: AudioPlayer, val imported: Boolean)

class SongLibrary(initialPlayer: AudioPlayer) {
    private var practiceDisplayed by mutableStateOf(true)
    val practiceActive get() = foreground && practiceDisplayed

    fun setPracticeVisible(visible: Boolean) {
        practiceDisplayed = visible
        if (!visible) song.player.pause()
    }

    var song by mutableStateOf(PracticeSong("아침의 리듬", sampleTrack, initialPlayer, false))
        private set
    var importOpen by mutableStateOf(false)
        private set
    var pendingAudio by mutableStateOf<ImportedAudio?>(null)
        private set
    var busy by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set
    var foreground by mutableStateOf(true)
        private set

    private var activeAudio: ImportedAudio? = null
    private var released = false

    fun setActive(active: Boolean) {
        foreground = active
        if (!active) song.player.pause()
    }

    fun openImport() {
        song.player.pause()
        error = null
        importOpen = true
    }

    fun startReading() {
        song.player.pause()
        busy = true
        error = null
    }

    fun reportError(message: String) {
        busy = false
        error = message
    }

    fun finishReading() {
        busy = false
    }

    fun selectAudio(audio: ImportedAudio) {
        if (released) {
            audio.dispose()
            return
        }
        pendingAudio?.dispose?.invoke()
        pendingAudio = audio
        busy = false
        error = null
    }

    fun completeImport(text: String, persist: () -> String? = { null }, createPlayer: (ImportedAudio) -> AudioPlayer) {
        if (released) return
        val audio = pendingAudio ?: return reportError("오디오 파일을 먼저 선택해 주세요.")
        val track = try {
            parseLrc(text, audio.durationMs)
        } catch (exception: IllegalArgumentException) {
            return reportError(exception.message ?: "LRC 파일을 확인해 주세요.")
        }
        val player = try {
            createPlayer(audio)
        } catch (_: Exception) {
            return reportError("음원을 열 수 없습니다. 다른 오디오 파일을 선택해 주세요.")
        }
        val playback = player.snapshot()
        if (!playback.isReady || playback.error != null) {
            player.release()
            return reportError(playback.error ?: "음원이 아직 준비되지 않았습니다. 다시 시도해 주세요.")
        }
        val saveError = try {
            persist()
        } catch (_: Exception) {
            "곡을 저장하지 못했습니다. 저장 공간을 확인해 주세요."
        }
        if (saveError != null) {
            player.release()
            return reportError(saveError)
        }
        song.player.release()
        activeAudio?.dispose?.invoke()
        activeAudio = audio
        pendingAudio = null
        song = PracticeSong(audio.name, track, player, true)
        busy = false
        error = null
        importOpen = false
    }

    fun cancelImport() {
        if (busy) return
        pendingAudio?.dispose?.invoke()
        pendingAudio = null
        error = null
        importOpen = false
    }

    fun useSample(player: AudioPlayer) {
        song.player.release()
        activeAudio?.dispose?.invoke()
        activeAudio = null
        song = PracticeSong("아침의 리듬", sampleTrack, player, false)
        pendingAudio?.dispose?.invoke()
        pendingAudio = null
        error = null
    }

    fun release() {
        if (released) return
        released = true
        song.player.release()
        activeAudio?.dispose?.invoke()
        pendingAudio?.dispose?.invoke()
        activeAudio = null
        pendingAudio = null
    }
}
