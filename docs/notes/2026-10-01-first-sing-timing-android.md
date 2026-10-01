# Time to first sing on the Android emulator

Issue: #24.
Target: under 60 seconds from app open to singing a matched song (Gate A in the [competitive brief](2026-09-29-competitive-brief.md)).
Protocol: "Manual protocol for the platform measurement" in [the service latency note](2026-09-29-first-sing-timing.md), with the same five songs as the [iOS runs](2026-09-30-first-sing-timing-ios.md).

## Result

The Android emulator does not meet the target: all five runs reached the first pronounced line, with a median of 80 seconds, and one run left part of the song without pronunciation.

| Song                         | Time | Outcome                                                                                         |
| ---------------------------- | ---- | ----------------------------------------------------------------------------------------------- |
| Vaundy - 踊り子              | 1:36 | Completed.                                                                                      |
| YOASOBI - 夜に駆ける         | 1:10 | Completed; the search opened a video that played, not the age-restricted music video (#70).     |
| Official髭男dism - Pretender | 1:35 | Completed.                                                                                      |
| King Gnu - 白日              | 1:09 | Completed.                                                                                      |
| あいみょん - マリーゴールド  | 1:20 | Timed to the first pronounced line, but the third pronunciation batch failed; see Observations. |

The operator did not record which step took the most time in each run.

## Setup

- **Date:** 2026-10-01, from about 11:24 to 11:32 KST, from the page-load times in the usage log's request IDs and the log's last write.
- **Device:** Android emulator AVD `Pixel_10`, Android 17, device locale `en-US`.
- **App:** the debug build that the #66 session installed over the existing app on 2026-09-30 at 22:15 KST: `main` with the native share bridges, which do not change search, lyrics, or pronunciation.
  The operator was asked to delete any saved practice for these songs before the runs; this note does not verify that none remained.
- **Server:** the development pronunciation server from `main`, reached through `adb reverse tcp:18773 tcp:18773`, with `gpt-5.4-mini-2026-03-17`.
- **Operator:** Andrew, with a stopwatch; each `<artist> - <title>` was pasted in Japanese.
- **Machine load:** the 15-minute load average was 8.0 at 11:37 KST, just after the runs; the 10-core Mac also ran the two iOS simulators and other sessions.

## Observations

- **Pronunciation language:** on the `en-US` device the page starts **읽을 언어** as English, so every run needed a change to 한국어 before **음차 만들기**.
  The operator asked to keep that choice as a user setting instead of deriving it from the device language each time.
- **Age restriction:** the 夜に駆ける search played without the age-restriction warning that stopped the iOS run.
  Repeating the app's search request from the Mac at 11:37 KST still returned the age-restricted music video `x8VYWazR5mE` first, so why the emulator got a different first result is not known.
- **Failed batch:** for マリーゴールド (47 lines), the usage log has three requests: two succeeded, and the third (`ok: false`) was billed (941 input and 855 output tokens) but rejected.
  The page stops at a failed batch and keeps the lines already made, so the third and fourth batches (lines 25 to 47) had no pronunciation in this run; the server log does not record why the result was rejected.
  The iOS run of the same song completed all four batches.
- **Compared with iOS:** the [iOS runs](2026-09-30-first-sing-timing-ios.md) had a median of 82 seconds over three completed runs; Android's median over five is 80 seconds.
  Service time is about 4.5 to 6.8 seconds before the first pronounced lines ([service latency note](2026-09-29-first-sing-timing.md)), so most of the time is in the person's steps, app launch, and player readiness, which these runs did not separate.

## Usage

`node server/usage.mjs` on `server/build/pronunciation-usage/2026-09-30T13-23-25-764Z.jsonl`:

| Song           | Requests | Failed | Lines sent | Input tokens | Output tokens |
| -------------- | -------- | ------ | ---------- | ------------ | ------------- |
| 踊り子         | 5        | 0      | 50         | 4,683        | 3,549         |
| 夜に駆ける     | 5        | 0      | 56         | 4,664        | 3,824         |
| Pretender      | 5        | 0      | 52         | 4,552        | 3,735         |
| 白日           | 7        | 0      | 82         | 6,262        | 4,682         |
| マリーゴールド | 3        | 1      | 36         | 2,798        | 2,261         |
| Total          | 25       | 1      | 276        | 22,959       | 18,051        |

All requests targeted Korean (`ko`), and none used cached or reasoning tokens.
The log names songs only by page run; the songs above follow the order of the runs and their line counts.

## Limits

- An emulator on the development Mac, not a physical Android device; no Android device was connected.
- One operator, one run per song, and no per-step times.
