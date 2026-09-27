package io.github.andrewdongminyoo.singbridge

private val timestamp = Regex("\\[(\\d{1,6}):([0-5]\\d)(?:\\.(\\d{2,3}))?]")
private val metadata = Regex("\\[(ar|al|ti|au|by|re|ve|length):.*]", RegexOption.IGNORE_CASE)
private val wordTimestamp = Regex("<\\d+:\\d+")
private val offsetTag = Regex("\\[offset:([+-]?\\d+)]", RegexOption.IGNORE_CASE)

fun parseLrc(text: String, durationMs: Long): PracticeTrack {
    require(durationMs > 0) { "음원의 길이를 확인할 수 없습니다." }
    require(text.length <= 1_048_576 && text.encodeToByteArray().size <= 1_048_576) {
        "LRC 파일은 1 MiB 이하여야 합니다."
    }
    val entries = mutableListOf<Pair<Long, String>>()
    text.removePrefix("\uFEFF").lineSequence().forEachIndexed { index, source ->
        val line = source.trim()
        if (line.isEmpty() || metadata.matches(line) || offsetTag.matchEntire(line)?.groupValues?.get(1)?.toLongOrNull() == 0L) {
            return@forEachIndexed
        }
        require(!line.startsWith("[offset:", ignoreCase = true)) {
            "시간 보정(offset)이 있는 LRC는 아직 지원하지 않습니다."
        }
        val times = mutableListOf<Long>()
        var position = 0
        while (true) {
            val match = timestamp.matchAt(line, position) ?: break
            val fraction = match.groupValues[3].padEnd(3, '0').toLong()
            times += match.groupValues[1].toLong() * 60_000 + match.groupValues[2].toLong() * 1_000 + fraction
            require(entries.size + times.size <= 10_000) { "가사 시간표시는 10,000개까지 지원합니다." }
            position = match.range.last + 1
        }
        val lyric = line.substring(position).trim()
        require(times.isNotEmpty() && !lyric.startsWith("[") && !wordTimestamp.containsMatchIn(lyric)) {
            "${index + 1}번째 줄의 시간표시를 확인해 주세요. [00:01.50]가사 형식을 지원합니다."
        }
        times.forEach { time ->
            require(time < durationMs || time == durationMs && lyric.isEmpty()) {
                "${index + 1}번째 줄의 시간이 음원 길이를 벗어납니다."
            }
            entries += time to lyric
        }
    }
    val groups = entries.groupBy({ it.first }, { it.second }).toList().sortedBy { it.first }
    val lines = groups.mapIndexedNotNull { index, (start, texts) ->
        val original = texts.filter { it.isNotEmpty() }.joinToString("\n")
        if (original.isEmpty()) return@mapIndexedNotNull null
        LyricLine(
            id = "lrc-$start",
            startMs = start,
            endMs = groups.getOrNull(index + 1)?.first ?: durationMs,
            original = original,
            pronunciation = "",
        )
    }
    require(lines.isNotEmpty()) { "시간표시가 있는 가사를 찾지 못했습니다." }
    return PracticeTrack(durationMs, lines)
}
