package io.github.andrewdongminyoo.singbridge

import android.content.Context
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.provider.OpenableColumns
import android.util.AtomicFile
import java.io.File
import java.io.FileOutputStream
import java.util.UUID
import org.json.JSONObject

internal class LastSongStore(private val context: Context) {
    private val directory = File(context.filesDir, "imported-song").apply { mkdirs() }
    private val manifest = AtomicFile(File(directory, "current.json"))
    private var activeFile: String? = null

    fun copyAudio(uri: Uri): ImportedAudio {
        val resolver = context.contentResolver
        val name = resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use {
            if (it.moveToFirst()) it.getString(0) else null
        } ?: "내 노래"
        val extension = name.substringAfterLast('.', "audio").filter { it.isLetterOrDigit() }.take(10).ifEmpty { "audio" }
        val file = File(directory, "song-${UUID.randomUUID()}.$extension")
        try {
            requireNotNull(resolver.openInputStream(uri)).use { input ->
                FileOutputStream(file).use { output ->
                    val buffer = ByteArray(65_536)
                    var total = 0L
                    while (true) {
                        val count = input.read(buffer)
                        if (count < 0) break
                        total += count
                        require(total <= 256L * 1_024 * 1_024)
                        output.write(buffer, 0, count)
                    }
                    output.fd.sync()
                }
            }
            return audio(file, name.take(200))
        } catch (exception: Exception) {
            file.delete()
            throw exception
        }
    }

    fun save(audio: ImportedAudio, lyrics: String): String? = try {
        val fileName = File(requireNotNull(Uri.parse(audio.uri).path)).name
        val json = JSONObject().put("version", 1).put("fileName", fileName)
            .put("title", audio.name).put("lyrics", lyrics).toString()
        val output = manifest.startWrite()
        try {
            output.write(json.toByteArray(Charsets.UTF_8))
            manifest.finishWrite(output)
        } catch (exception: Exception) {
            manifest.failWrite(output)
            throw exception
        }
        activeFile = fileName
        null
    } catch (_: Exception) {
        "곡을 저장하지 못했습니다. 저장 공간을 확인해 주세요."
    }

    fun load(): Pair<ImportedAudio, String>? {
        if (!manifest.baseFile.exists() && !File(directory, "current.json.bak").exists()) {
            removeUnusedCopies()
            return null
        }
        val json = manifest.openRead().use {
            require(it.channel.size() <= 8L * 1_024 * 1_024)
            JSONObject(it.readBytes().decodeToString(throwOnInvalidSequence = true))
        }
        require(json.getInt("version") == 1)
        val fileName = json.getString("fileName")
        require(fileName == File(fileName).name && fileName.startsWith("song-"))
        activeFile = fileName
        val selected = audio(File(directory, fileName), json.getString("title"))
        removeUnusedCopies()
        return selected to json.getString("lyrics")
    }

    fun clear(): Boolean {
        manifest.delete()
        val cleared = !manifest.baseFile.exists() && !File(directory, "current.json.bak").exists()
        if (cleared) {
            activeFile = null
        }
        return cleared
    }

    private fun audio(file: File, name: String): ImportedAudio {
        val metadata = MediaMetadataRetriever()
        val duration = try {
            metadata.setDataSource(file.absolutePath)
            require(metadata.extractMetadata(MediaMetadataRetriever.METADATA_KEY_HAS_AUDIO) == "yes")
            metadata.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull()
        } finally {
            metadata.release()
        }
        require(duration != null && duration > 0)
        return ImportedAudio(name, Uri.fromFile(file).toString(), duration) {
            if (file.name != activeFile) file.delete()
        }
    }

    fun removeUnusedCopies() {
        directory.listFiles()?.filter { it.name.startsWith("song-") && it.name != activeFile }?.forEach { it.delete() }
    }
}
