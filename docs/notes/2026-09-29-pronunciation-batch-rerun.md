# Pronunciation batch rerun after the #29 fix

<!-- cspell:words dism -->

Issue: #29.
Earlier run: [time to first sing](2026-09-29-first-sing-timing.md), where 3 of 5 songs stopped at the second batch with HTTP 502.

## What was run

On 2026-09-29 from 10:33 to 10:35 UTC, a one-off Node script on the development Mac repeated the service path of the earlier run for the same five songs, against `origin/main` at `54d9865`, which includes the server normalization from #31.
The script started `server/index.mjs` from that commit and sent the Korean-target (`ko`) batches to it one after another.

It kept the earlier run's method in the linked note, with two differences:

- Lyric lines came from a copy of the page's `parseTimedLyrics` instead of the earlier approximation. The line counts were the same as in the earlier run for all five songs.
- The request IDs did not match the server's `<digits>-<digits>` format, so the usage log stored `requestId: null`. Records were assigned to songs by their `sequence` numbers, which follow the one-at-a-time send order.

The script printed timings, record IDs, and counts only; no lyric text or key was printed or stored.

## Completion

| Song                         | LRCLIB record | Lines / batches | First batch | All batches | Batches with HTTP 200 |
| ---------------------------- | ------------- | --------------- | ----------- | ----------- | --------------------- |
| Vaundy - 踊り子              | 35902952      | 50 / 5          | 5.0 s       | 17.9 s      | 5 of 5                |
| YOASOBI - 夜に駆ける         | 6918922       | 56 / 5          | 3.1 s       | 15.8 s      | 5 of 5                |
| Official髭男dism - Pretender | 34678411      | 52 / 5          | 2.7 s       | 14.3 s      | 5 of 5                |
| King Gnu - 白日              | 10428545      | 82 / 7          | 2.6 s       | 18.8 s      | 7 of 7                |
| あいみょん - マリーゴールド  | 11839819      | 47 / 4          | 3.1 s       | 12.5 s      | 4 of 4                |

All 26 batches completed, including the three songs that failed in the earlier run.
The three LRCLIB records named in #29 were chosen again; the earlier run did not record the other two IDs.
Every chosen record was within 1 second of the video duration.

## Token usage

The usage log recorded 26 requests, none failed, all with `gpt-5.4-mini-2026-03-17`.

| Song                         | Requests | Lines sent | Input tokens | Cached input tokens | Output tokens | Reasoning tokens |
| ---------------------------- | -------- | ---------- | ------------ | ------------------- | ------------- | ---------------- |
| Vaundy - 踊り子              | 5        | 50         | 3,074        | 0                   | 3,043         | 0                |
| YOASOBI - 夜に駆ける         | 5        | 56         | 3,112        | 0                   | 3,335         | 0                |
| Official髭男dism - Pretender | 5        | 52         | 2,981        | 0                   | 3,191         | 0                |
| King Gnu - 白日              | 7        | 82         | 4,139        | 0                   | 4,037         | 0                |
| あいみょん - マリーゴールド  | 4        | 47         | 2,474        | 0                   | 2,702         | 0                |

The sums are 15,780 input and 16,308 output tokens.

## Segments returned without pronunciation

Completion does not mean every line got a Hangul pronunciation.
Of 314 returned segments, 85 were marked `needsReview` and carried `pronunciation: null`; no other segment had a null pronunciation.

| Song                         | Segments | Without pronunciation | Batches where every segment was flagged |
| ---------------------------- | -------- | --------------------- | --------------------------------------- |
| Vaundy - 踊り子              | 60       | 8                     | none                                    |
| YOASOBI - 夜に駆ける         | 57       | 32                    | 2, 3, 5                                 |
| Official髭男dism - Pretender | 60       | 5                     | none                                    |
| King Gnu - 白日              | 82       | 12                    | 2                                       |
| あいみょん - マリーゴールド  | 55       | 28                    | 1, 4                                    |

In those six batches every line came back without pronunciation, so a user would see none for 32 of 56 lines of 夜に駆ける, at least 23 of 47 lines of マリーゴールド, and 12 of 82 lines of 白日.
The マリーゴールド count is a lower bound because its batch 3 had one more flagged segment, and the script did not record whether that segment was a whole line.
The fully flagged second batches of 夜に駆ける and 白日 are the batches that failed in the earlier run.

The server returns only the normalized result, so this output cannot show where a flag came from.
Under the #31 normalization, `validateResult` in `server/pronunciation.mjs` sets `needsReview` when the model flagged the segment, when the language is `und`, or when a foreign-language segment has an empty or missing pronunciation, and then removes the pronunciation of every flagged segment.
Any of the 85 segments may therefore have been flagged by the server rather than the model, and a flagged segment may or may not have had a pronunciation from the model; only a raw provider capture can separate these cases.
The follow-up is tracked in #37; #39 found that most of these pronunciations were removed by the normalization, and #40 changed the prompt so that uncertain readings get a flagged pronunciation.

## Reading the numbers

Machine time until the first batch returned was about 4.2 to 6.6 seconds (search, lyrics, and first batch), and a full song took 12.5 to 18.8 seconds, which is consistent with the earlier run.
For マリーゴールド the first batch carried no pronunciation, so its first pronounced line arrived with batch 2, about 7.6 seconds after the search, and sits after the first 12 lyric lines.
The batch failures from #29 no longer occur on these songs, so the device protocol in the earlier note can now be run for #24.
Step 5 of that protocol stops when the first line with pronunciation is highlighted, so while batches without any pronunciation remain (#37, then #40) a song like マリーゴールド adds playback through its unpronounced opening lines to the measured time; record the affected songs separately.
