# LRCLIB coverage gate run on the approved song list

<!-- cspell:words Kenshi Yonezu -->

Issue: #19.
List: `tools/lyrics-coverage/songs-2026-09.json`, approved by the operator by merging PR #49; the [list note](2026-09-29-lyrics-coverage-song-list.md) records how it was chosen.
Target: synced LRCLIB lyrics for at least 70% of the curated 30 songs, with false matches counted separately (Gate A in the [competitive brief](2026-09-29-competitive-brief.md)).

## What was run

On 2026-09-30 at 00:34 UTC, `node tools/lyrics-coverage/coverage.mjs tools/lyrics-coverage/songs-2026-09.json --out build/lyrics-coverage.json` ran on `c6f785a` with the tool's defaults (one request per song, 1 second apart, 2-second duration tolerance).
LRCLIB answered one song, back number - ヒロイン, with HTTP 503, so the tool recorded it as `error`.
At 00:35 UTC the same command ran on a one-entry list holding only that song, and that result replaces the error below.
No lyric text was read or stored.
Both tool reports are kept unchanged except for formatting, so the classification below can be checked later even if LRCLIB results change: [the main run](2026-09-30-lyrics-coverage-gate-run.json) and [the rerun](2026-09-30-lyrics-coverage-gate-rerun.json).
They hold record IDs, names, album names, durations, lyric types, and the per-song status, and no lyric text.
The tool keeps at most five candidates per song, ranked by duration difference, out of the up to 20 the app displays, so a record outside those five, such as ヒロイン's synced record at another length, is counted in the status but not listed.

## Result per song

`durationSeconds` is the length of the first video the app shows; the match is the top synced candidate within 2 seconds.

| Rank | Song                                        | Duration (s) | Status                          | Match (LRCLIB ID, duration) |
| ---- | ------------------------------------------- | ------------ | ------------------------------- | --------------------------- |
| 1    | Official髭男dism - Pretender                | 336          | `synced`                        | 34678411, 336 s             |
| 2    | tuki. - 晩餐歌                              | 220          | `synced`                        | 36513119, 220 s             |
| 4    | 優里 - ベテルギウス                         | 292          | `synced-other-duration`         |                             |
| 5    | 米津玄師 - IRIS OUT                         | 154          | `synced`                        | 24586951, 152 s             |
| 6    | 米津玄師 - Lemon                            | 275          | `synced`                        | 9908302, 275 s              |
| 9    | back number - ヒロイン                      | 270          | `synced-other-duration` (rerun) |                             |
| 11   | 米津玄師 & 宇多田ヒカル - JANE DOE          | 247          | `synced`                        | 26600318, 246 s             |
| 12   | Novelbright - Walking with you              | 229          | `synced`                        | 35549827, 229 s             |
| 13   | 冨岡 愛 - グッバイバイ                      | 228          | `none`                          |                             |
| 14   | Vaundy - 踊り子                             | 246          | `synced`                        | 35902952, 246 s             |
| 15   | imase - NIGHT DANCER                        | 211          | `synced`                        | 33679367, 211 s             |
| 16   | SPYAIR - サムライハート(Some Like It Hot!!) | 215          | `synced`                        | 35613348, 215 s             |
| 19   | あいみょん - 愛を伝えたいだとか             | 256          | `synced-other-duration`         |                             |
| 20   | ロクデナシ - ただ声一つ                     | 162          | `synced`                        | 35674678, 162 s             |
| 21   | 米津玄師 - LADY                             | 244          | `synced`                        | 35057582, 244 s             |
| 22   | 松田 聖子 - 青い珊瑚礁                      | 225          | `synced`                        | 22695314, 226 s             |
| 23   | 優里 - ドライフラワー                       | 288          | `synced`                        | 20605926, 288 s             |
| 24   | 高橋洋子 - 残酷な天使のテーゼ               | 244          | `synced`                        | 20917586, 243 s             |
| 25   | ユイカ - 好きだから。                       | 299          | `synced`                        | 33381569, 299 s             |
| 28   | Mrs. GREEN APPLE - ライラック               | 304          | `synced`                        | 19736310, 304 s             |
| 29   | YOASOBI - 夜に駆ける                        | 276          | `synced`                        | 6918922, 275 s              |
| 30   | 米津玄師 - KICK BACK                        | 228          | `synced`                        | 10451203, 227 s             |
| 31   | Tani Yuuki - W / X / Y                      | 189          | `synced-other-duration`         |                             |
| 32   | Vaundy - 怪獣の花唄                         | 233          | `synced`                        | 19912792, 232 s             |
| 33   | あいみょん - マリーゴールド                 | 322          | `synced`                        | 11839819, 322 s             |
| 34   | 松原みき - 真夜中のドア〜stay with me       | 311          | `synced`                        | 11415679, 311 s             |
| 35   | YOASOBI - たぶん                            | 264          | `synced`                        | 34207675, 264 s             |
| 36   | キタニタツヤ - 青のすみか                   | 201          | `synced`                        | 37467719, 201 s             |
| 38   | 優里 - レオ                                 | 269          | `synced`                        | 34366859, 271 s             |
| 39   | Leina - うたたね                            | 205          | `synced`                        | 36718461, 205 s             |

With the rerun, all 30 songs were measured: 25 `synced`, 4 `synced-other-duration`, 0 `plain-only`, and 1 `none`, so 25 of 30 (83.3%) have synced lyrics at the played video's length.

## False matches, by metadata

A `synced` status does not prove that the lyrics fit the recording, and this run did not read lyric text, so the check below uses record names only; a person still has to confirm each match in the app.

- **Likely false:** IRIS OUT matched record 24586951, titled `IRIS OUT (English Cover)`, whose lyrics would be an English cover rather than the Japanese song.
- **Questionable:** 残酷な天使のテーゼ matched record 20917586, titled `残酷な天使のテーゼ (OFF VOCAL Version)`; its synced lyrics may still be the song's, but the record names an instrumental version.
- Several matches are titled after a music video upload, for example `【imase】NIGHT DANCER（MV）` and `米津玄師  Kenshi Yonezu  - Lemon`; the titles match the songs and the durations match the videos, so they are not counted as false here.

Counting the two flagged matches as false leaves 23 of 30 (76.7%).
Either way the result is above the 70% target, provided a person confirms the remaining matches.

## Songs without synced lyrics at the video length

- **ベテルギウス:** synced records exist at 231 seconds, the track length, while the first video runs 292 seconds.
- **ヒロイン:** at the 270-second video length LRCLIB has only instrumental and plain records; synced lyrics exist only at another length.
- **愛を伝えたいだとか:** the synced record in the report is a live version at 260 seconds, against a 256-second video.
- **W / X / Y:** the first video is the fan-made collaboration lyric video the list note flagged (189 seconds); a synced record of the original exists at 273 seconds.
- **グッバイバイ:** no displayed candidate has usable lyrics.

The app lists candidates of other lengths too, so a user can still pick one of these records and adjust the sync; this run does not measure whether such a record fits the video.

## Limits

LRCLIB search results and the first YouTube video change over time, so this records one run.
The check does not run the app's LRC parser, so a record the app rejects would still count as synced.
The rerun of one song happened a minute after the main run and is part of the same measurement for the ratio above.
