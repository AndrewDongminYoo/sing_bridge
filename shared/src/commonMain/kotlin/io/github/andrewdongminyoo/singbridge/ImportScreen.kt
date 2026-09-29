package io.github.andrewdongminyoo.singbridge

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

@Composable
fun ImportScreen(library: SongLibrary, onPickAudio: () -> Unit, onPickLyrics: () -> Unit, onPractice: () -> Unit) {
    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = Color(0xFF235E52),
            background = Color(0xFFFAF7F0),
            onBackground = Color(0xFF263B35),
        ),
    ) {
        Scaffold { insets ->
            Column(
                Modifier.fillMaxSize().padding(insets).verticalScroll(rememberScrollState()).padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp),
            ) {
                Text("내 노래", style = MaterialTheme.typography.headlineLarge)
                Text("내 오디오와 LRC 가사로 연습해 보세요.")
                if (library.song.imported) {
                    Text("기기에 저장된 곡", style = MaterialTheme.typography.labelLarge)
                    Text(library.song.title, style = MaterialTheme.typography.titleLarge)
                    OutlinedButton(onClick = onPractice, enabled = !library.busy) { Text("이 곡 연습하기") }
                }
                Text("오디오를 선택한 뒤 같은 곡의 LRC 가사를 선택해 주세요. 가져온 가사는 원문으로 표시돼요.")
                Button(onClick = onPickAudio, enabled = !library.busy, modifier = Modifier.fillMaxWidth()) {
                    Text(if (library.pendingAudio == null) "1. 오디오 선택" else "오디오 다시 선택")
                }
                library.pendingAudio?.let { Text(it.name) }
                Button(
                    onClick = onPickLyrics,
                    enabled = !library.busy && library.pendingAudio != null,
                    modifier = Modifier.fillMaxWidth(),
                ) { Text("2. LRC 선택하고 연습 시작") }
                if (library.busy) Text("파일을 읽고 있어요…")
                library.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                if (library.pendingAudio != null) {
                    TextButton(onClick = library::cancelImport, enabled = !library.busy) { Text("선택 취소") }
                }
                Text(
                    "마지막 한 곡을 앱에 복사해 보관해요. 새 곡을 가져오면 이전 곡을 대체해요.",
                    style = MaterialTheme.typography.bodySmall,
                )
                Text(
                    "오디오 최대 256 MiB · UTF-8 LRC 최대 1 MiB",
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }
    }
}
