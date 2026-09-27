package io.github.andrewdongminyoo.singbridge

import io.github.andrewdongminyoo.singbridge.resources.Res
import org.jetbrains.compose.resources.ExperimentalResourceApi

val sampleTrack = PracticeTrack(
    durationMs = 28_000,
    lines = listOf(
        LyricLine("morning", 2_000, 8_000, "朝の風を感じて", "아사노 카제오 칸지테"),
        LyricLine("voice", 8_000, 14_000, "小さな声で歌おう", "치이사나 코에데 우타오오"),
        LyricLine("distance", 14_000, 20_000, "昨日より少し遠く", "키노오요리 스코시 토오쿠"),
        LyricLine("rhythm", 20_000, 26_000, "君のリズムで歩こう", "키미노 리즈무데 아루코오"),
    ),
)

@OptIn(ExperimentalResourceApi::class)
fun sampleAudioUri(): String = Res.getUri("files/practice.wav")
