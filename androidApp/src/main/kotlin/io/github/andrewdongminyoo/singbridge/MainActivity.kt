package io.github.andrewdongminyoo.singbridge

import android.os.Bundle
import android.net.Uri
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {
    private lateinit var library: SongLibrary
    private lateinit var store: LastSongStore
    private val importScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val audioPicker = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) readAudio(uri)
    }
    private val lyricsPicker = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) readLyrics(uri)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        library = SongLibrary(AndroidAudioPlayer(this))
        store = LastSongStore(applicationContext)
        restoreSong()
        setContent {
            LibraryApp(
                library,
                onPickAudio = { audioPicker.launch(arrayOf("audio/*")) },
                onPickLyrics = { lyricsPicker.launch(arrayOf("*/*")) },
                onSample = {
                    if (store.clear()) {
                        library.useSample(AndroidAudioPlayer(this))
                        store.removeUnusedCopies()
                    } else library.reportError("저장한 곡을 지우지 못했습니다. 다시 시도해 주세요.")
                },
            )
        }
    }

    private fun restoreSong() {
        library.startReading()
        importScope.launch {
            try {
                val saved = withContext(Dispatchers.IO) { store.load() }
                if (saved != null) {
                    library.selectAudio(saved.first)
                    library.completeImport(saved.second) { AndroidAudioPlayer(this@MainActivity, it.uri) }
                } else {
                    library.finishReading()
                }
            } catch (exception: CancellationException) {
                throw exception
            } catch (_: Exception) {
                library.reportError("저장한 곡을 열지 못했습니다. 다시 불러오거나 샘플곡을 사용해 주세요.")
            }
        }
    }

    private fun readAudio(uri: Uri) {
        library.startReading()
        importScope.launch {
            try {
                val audio = withContext(Dispatchers.IO) { store.copyAudio(uri) }
                library.selectAudio(audio)
            } catch (exception: CancellationException) {
                throw exception
            } catch (_: Exception) {
                library.reportError("음원을 가져오지 못했습니다. 256 MiB 이하 오디오 파일과 저장 공간을 확인해 주세요.")
            }
        }
    }

    private fun readLyrics(uri: Uri) {
        library.startReading()
        importScope.launch {
            try {
                val text = withContext(Dispatchers.IO) {
                    val bytes = requireNotNull(contentResolver.openInputStream(uri)).use { input ->
                        val output = java.io.ByteArrayOutputStream()
                        val buffer = ByteArray(8_192)
                        while (true) {
                            val count = input.read(buffer)
                            if (count < 0) break
                            require(output.size() + count <= 1_048_576) { "LRC 파일은 1 MiB 이하여야 합니다." }
                            output.write(buffer, 0, count)
                        }
                        output.toByteArray()
                    }
                    bytes.decodeToString(throwOnInvalidSequence = true)
                }
                val audio = library.pendingAudio
                library.completeImport(text, persist = {
                    if (audio == null) "오디오 파일을 다시 선택해 주세요." else store.save(audio, text)
                }) { AndroidAudioPlayer(this@MainActivity, it.uri) }
            } catch (exception: CancellationException) {
                throw exception
            } catch (_: Exception) {
                library.reportError("LRC를 읽을 수 없습니다. UTF-8로 저장된 1 MiB 이하 파일을 선택해 주세요.")
            }
        }
    }

    override fun onStart() {
        super.onStart()
        library.setActive(true)
    }

    override fun onStop() {
        library.setActive(false)
        super.onStop()
    }

    override fun onDestroy() {
        importScope.cancel()
        library.release()
        super.onDestroy()
    }
}
