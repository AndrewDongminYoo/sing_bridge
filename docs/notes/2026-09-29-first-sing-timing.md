# Time to first sing: service latency and manual protocol

<!-- cspell:words dism -->

Issue: #24.
Target: under 60 seconds from app open to singing a matched song (Gate A in the [competitive brief](2026-09-29-competitive-brief.md)).

## What was measured

On 2026-09-29 at about 07:24 UTC, a one-off Node script on the development Mac followed the app's first-sing path for five songs without the UI:

1. YouTube Data API search with the app's parameters (`maxResults=1`, embeddable, syndicated).
2. LRCLIB `GET /api/search?q=<artist> <title>`, choosing the synced record closest to the video duration.
3. Korean-target (`ko`) pronunciation through the local server (`node server/index.mjs`) in the page's batches of up to 12 lines and 3,000 characters, sent one after another.

The video duration came from an extra `videos.list` call that the app does not make; the app reads it from the player.
Lyric lines were extracted by stripping timestamps and blank lines, which approximates `parseTimedLyrics`.
The script printed timings and counts only; no lyric text or key was printed or stored.

| Song                         | YouTube search | LRCLIB search | Lines / batches | First batch | All batches       |
| ---------------------------- | -------------- | ------------- | --------------- | ----------- | ----------------- |
| Vaundy - 踊り子              | 359 ms         | 1,223 ms      | 50 / 5          | 5.2 s       | 19.3 s            |
| YOASOBI - 夜に駆ける         | 389 ms         | 875 ms        | 56 / 5          | 4.1 s       | failed at batch 2 |
| Official髭男dism - Pretender | 361 ms         | 852 ms        | 52 / 5          | 3.7 s       | 19.4 s            |
| King Gnu - 白日              | 363 ms         | 876 ms        | 82 / 7          | 3.2 s       | failed at batch 2 |
| あいみょん - マリーゴールド  | 368 ms         | 1,072 ms      | 47 / 4          | 4.2 s       | failed at batch 2 |

Every chosen LRCLIB record was within 1 second of the video duration.

## Reading the numbers

Service time before the first pronounced lines appear was about 4.5 to 6.8 seconds (search, lyrics, and first batch), and a full song took about 19 seconds when it completed.
That is a lower bound: it excludes app launch, typing, YouTube player readiness, choosing the lyric record, tapping controls, and native WebView overhead, which only a person on a device can time.
Machine time alone does not threaten the 60-second target.

The larger problem is completion: 3 of 5 songs failed partway with HTTP 502, 3 of 16 requests in total.
Rerunning the failed batches showed that the server rejects a whole batch when the model fills a pronunciation for a phrase it marked for review; this is tracked in #29.
Until that is fixed, a user would see pronunciation stop after the first 12 lines on most of these songs.
After the fix, a [rerun of the same five songs](2026-09-29-pronunciation-batch-rerun.md) completed every batch.

## Manual protocol for the platform measurement

Run this after #29 is fixed, with the development server running as the README describes.
Pronunciation currently works only in Debug builds on the iOS simulator, where `YouTubeScreen.swift` registers the handler under `DEBUG && targetEnvironment(simulator)`, and on an Android debug build with `adb reverse tcp:18773 tcp:18773`.
A physical iPhone cannot generate pronunciation, so the iOS run uses a simulator until a supported transport exists (#16).

Before each run, make sure no pronunciation is saved for the song: delete it under **저장한 연습** or clear the app's data.
Selecting a saved video and lyric pair restores its pronunciation, which skips or shortens generation.

1. Force-quit the app, start a stopwatch, and open it.
2. Open the **YouTube** tab, search `<artist> - <title>`, and confirm the video title and channel.
3. Open **가사 선택** and choose the synced record whose title, artist, album, and duration match the video, after checking its preview; choosing it closes the panel.
4. Open **가사·설정** again, confirm **읽을 언어** is 한국어, tap **음차 만들기**, and close the panel, because playback cannot start while it is open.
5. Start playback and stop the stopwatch when the first lyric line with pronunciation is highlighted.
6. Record the total and the step where most time went.

Use the same five songs on each platform.
Record the device or simulator, OS version, network, and whether the video, lyrics, and pronunciation all loaded.
Evaluate each platform separately: the Gate A target is met on a platform when its median is under 60 seconds and no step fails, and one platform's runs must not offset the other's.
