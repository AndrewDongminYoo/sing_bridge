package io.github.andrewdongminyoo.singbridge

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive

private val Pine = Color(0xFF235E52)
private val Paper = Color(0xFFFAF7F0)
private val Ink = Color(0xFF263B35)

private data class PracticeScreenState(
    val playback: PlaybackSnapshot,
    val selectedLine: Int,
    val repeatEnabled: Boolean,
    val lyricsHidden: Boolean,
)

private fun PracticeSession.screenState(playback: PlaybackSnapshot) = PracticeScreenState(
    playback, selectedLine, repeatEnabled, lyricsHidden,
)

@Composable
fun LibraryApp(library: SongLibrary, onPickAudio: () -> Unit, onPickLyrics: () -> Unit, onSample: () -> Unit) {
    val song = library.song
    App(
        song.player, song.track, song.title, song.imported,
        library.importOpen || library.busy || !library.foreground,
        library::openImport, onSample,
        if (library.importOpen) null else library.error,
    )
    if (library.importOpen) {
        MaterialTheme {
            AlertDialog(
                onDismissRequest = library::cancelImport,
                title = { Text("내 노래 불러오기") },
                text = {
                    Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("오디오를 선택한 뒤 같은 곡의 LRC 가사를 선택해 주세요. 가져온 가사는 원문으로 표시돼요.")
                        Text("마지막 한 곡을 앱에 복사해 보관해요. 샘플곡으로 돌아가면 저장한 곡은 삭제돼요.")
                        Button(onClick = onPickAudio, enabled = !library.busy) { Text("1. 오디오 선택") }
                        library.pendingAudio?.let { Text(it.name) }
                        Button(onClick = onPickLyrics, enabled = !library.busy && library.pendingAudio != null) {
                            Text("2. LRC 선택하고 연습 시작")
                        }
                        if (library.busy) Text("파일을 읽고 있어요…")
                        library.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                        Text("오디오 최대 256 MiB · UTF-8 LRC 최대 1 MiB · 시간 보정과 단어별 타이밍은 아직 지원하지 않아요.")
                    }
                },
                confirmButton = {
                    TextButton(onClick = library::cancelImport, enabled = !library.busy) { Text("취소") }
                },
            )
        }
    }
}

@Composable
fun App(
    player: AudioPlayer,
    track: PracticeTrack = sampleTrack,
    title: String = "아침의 리듬",
    imported: Boolean = false,
    suspended: Boolean = false,
    onImport: (() -> Unit)? = null,
    onSample: (() -> Unit)? = null,
    notice: String? = null,
) {
    val session = remember(player, track) { PracticeSession(track, player) }
    var state by remember(session) { mutableStateOf(session.screenState(player.snapshot())) }
    var draggedPosition by remember(session) { mutableStateOf<Float?>(null) }
    val listState = rememberLazyListState()
    fun update(action: () -> Unit) {
        action()
        state = session.screenState(player.snapshot())
    }
    LaunchedEffect(session, suspended) {
        while (isActive) {
            state = session.screenState(if (suspended) player.snapshot() else session.poll())
            delay(80)
        }
    }
    val activeLine = track.activeLineAt(state.playback.positionMs)
    val controlsEnabled = !suspended && state.playback.isReady && state.playback.error == null
    LaunchedEffect(session) { listState.scrollToItem(0) }
    LaunchedEffect(activeLine) {
        if (state.playback.isPlaying && activeLine != null) {
            listState.animateScrollToItem(activeLine + 1)
        }
    }

    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = Pine,
            onPrimary = Color.White,
            background = Paper,
            surface = Paper,
            onSurface = Ink,
            onBackground = Ink,
            secondaryContainer = Color(0xFFDFEAE3),
            onSecondaryContainer = Pine,
        ),
    ) {
        Scaffold(
            containerColor = Paper,
            bottomBar = {
                Surface(color = Paper, shadowElevation = 8.dp) {
                    Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.TopCenter) {
                        Column(
                            Modifier.widthIn(max = 600.dp).fillMaxWidth()
                                .padding(horizontal = 24.dp, vertical = 12.dp)
                                .navigationBarsPadding(),
                        ) {
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                FilterChip(
                                    selected = state.repeatEnabled,
                                    onClick = { update(session::toggleRepeat) },
                                    enabled = controlsEnabled,
                                    label = { Text("선택 구절 반복") },
                                )
                                FilterChip(
                                    selected = state.lyricsHidden,
                                    onClick = { update(session::toggleLyrics) },
                                    label = { Text(if (state.lyricsHidden) "가사 보기" else "가사 가리기") },
                                )
                            }
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Text(
                                    if (state.repeatEnabled) "${state.selectedLine + 1}번 구절 반복 중"
                                    else "내 속도로 익혀 보세요",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = Pine,
                                )
                                Text(
                                    "${formatTime(state.playback.positionMs)} / ${formatTime(track.durationMs)}",
                                    style = MaterialTheme.typography.labelMedium,
                                )
                            }
                            Slider(
                                value = draggedPosition ?: state.playback.positionMs.toFloat(),
                                onValueChange = { draggedPosition = it },
                                onValueChangeFinished = {
                                    draggedPosition?.let { position -> update { session.seekTo(position.toLong()) } }
                                    draggedPosition = null
                                },
                                valueRange = 0f..track.durationMs.toFloat(),
                                enabled = controlsEnabled,
                                modifier = Modifier.semantics { contentDescription = "재생 위치" },
                            )
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                TextButton(
                                    onClick = { update { session.seekTo(0) } },
                                    enabled = controlsEnabled,
                                ) { Text("처음부터") }
                                Button(
                                    onClick = { update(session::togglePlayback) },
                                    enabled = controlsEnabled,
                                    modifier = Modifier.weight(1f).heightIn(min = 52.dp),
                                    shape = RoundedCornerShape(18.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Pine),
                                ) {
                                    Text(
                                        when {
                                            state.playback.error != null -> "재생 불가"
                                            !state.playback.isReady -> "음원 준비 중"
                                            state.playback.isPlaying -> "일시정지"
                                            else -> "재생"
                                        },
                                        fontSize = 17.sp,
                                        fontWeight = FontWeight.Bold,
                                    )
                                }
                            }
                        }
                    }
                }
            },
        ) { insets ->
            Box(Modifier.fillMaxSize().padding(insets), contentAlignment = Alignment.TopCenter) {
                LazyColumn(
                    Modifier.widthIn(max = 600.dp).fillMaxSize(),
                    state = listState,
                    contentPadding = PaddingValues(24.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    item {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                Modifier.size(34.dp).background(Pine, CircleShape),
                                contentAlignment = Alignment.Center,
                            ) { Text("S", color = Color.White, fontWeight = FontWeight.Bold) }
                            Text(
                                "SingBridge",
                                Modifier.padding(start = 10.dp),
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                        Spacer(Modifier.height(28.dp))
                        Text("한 구절씩, 내 노래로", color = Pine, fontSize = 13.sp)
                        Text(
                            title,
                            Modifier.padding(top = 8.dp),
                            fontSize = 32.sp,
                            fontWeight = FontWeight.Bold,
                        )
                        Text(if (imported) "내 가사 · 원문" else "일본어 → 한글 발음", Modifier.padding(top = 8.dp), color = Pine)
                        Text(
                            if (imported) "내 오디오와 LRC · 기기에 저장됨" else "연습용 샘플 · 보컬 없는 28초 반주",
                            Modifier.padding(top = 8.dp),
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFF63716A),
                        )
                        Row {
                            onImport?.let { TextButton(onClick = it, enabled = !suspended) { Text("내 노래 불러오기") } }
                            if (imported || notice != null) onSample?.let {
                                TextButton(onClick = it, enabled = !suspended) { Text("샘플곡으로") }
                            }
                        }
                        notice?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                        Spacer(Modifier.height(20.dp))
                        Text(
                            "구절을 누르면 그 부분부터 연습할 수 있어요.",
                            Modifier.padding(top = 4.dp, bottom = 4.dp),
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFF63716A),
                        )
                    }
                    state.playback.error?.let { message ->
                        item {
                            Text(message, color = MaterialTheme.colorScheme.error)
                        }
                    }
                    itemsIndexed(track.lines, key = { _, line -> line.id }) { index, line ->
                        LyricCard(
                            line = line,
                            index = index,
                            active = activeLine == index,
                            isSelected = state.selectedLine == index,
                            hidden = state.lyricsHidden,
                            enabled = controlsEnabled,
                            onClick = { update { session.selectLine(index) } },
                        )
                    }
                    item {
                        Text(
                            if (imported) "가져온 가사를 그대로 표시해요. 자동 발음 변환은 아직 지원하지 않아요."
                            else "한글 발음은 따라 부르기를 돕는 참고 표기예요.",
                            Modifier.padding(top = 8.dp),
                            color = Color(0xFF63716A),
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun LyricCard(
    line: LyricLine,
    index: Int,
    active: Boolean,
    isSelected: Boolean,
    hidden: Boolean,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth()
            .semantics { selected = isSelected }
            .clickable(enabled = enabled, onClickLabel = "${index + 1}번 구절로 이동", onClick = onClick),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = if (active) Pine else Color.White),
        border = BorderStroke(1.dp, if (isSelected) Pine else Color(0xFFE7E8E0)),
    ) {
        Column(Modifier.fillMaxWidth().heightIn(min = 122.dp).padding(20.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(
                    "${index + 1}번 구절 · ${formatTime(line.startMs)}",
                    color = if (active) Color(0xFFCFE4D9) else Color(0xFF63716A),
                    style = MaterialTheme.typography.labelSmall,
                )
                if (active || isSelected) {
                    Text(
                        if (active) "지금 부르는 구절" else "선택한 구절",
                        color = if (active) Color(0xFFEEC779) else Pine,
                        style = MaterialTheme.typography.labelSmall,
                    )
                }
            }
            Text(
                if (hidden) "가사를 떠올리며 불러 보세요" else line.original,
                Modifier.padding(top = 12.dp),
                color = if (active) Color(0xFFDFEAE3) else Color(0xFF63716A),
                fontSize = if (line.pronunciation.isEmpty()) 21.sp else 15.sp,
            )
            if (!hidden && line.pronunciation.isNotEmpty()) {
                Text(
                    line.pronunciation,
                    Modifier.padding(top = 6.dp),
                    color = if (active) Color.White else Ink,
                    fontSize = 21.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
    }
}

private fun formatTime(positionMs: Long): String {
    val seconds = positionMs.coerceAtLeast(0) / 1000
    return "${seconds / 60}:${(seconds % 60).toString().padStart(2, '0')}"
}
