# Time to first sing on the iOS simulator

<!-- cspell:words dism yoru kakeru -->

Issue: #24.
Target: under 60 seconds from app open to singing a matched song (Gate A in the [competitive brief](2026-09-29-competitive-brief.md)).
Protocol: "Manual protocol for the platform measurement" in [the service latency note](2026-09-29-first-sing-timing.md), with the same five songs.

## Result

The iOS simulator does not meet the target: the three completed runs have a median of 82 seconds, and one of the five runs failed.

| Song                         | Time   | Outcome                                                                                       |
| ---------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| Vaundy - 踊り子              | 2:24   | Not valid: pronunciation was first generated in English by mistake, then generated in Korean. |
| YOASOBI - 夜に駆ける         | (0:51) | Failed: the first search result is age-restricted, and the embedded player refused it (#70).  |
| Official髭男dism - Pretender | 1:16   | Completed.                                                                                    |
| King Gnu - 白日              | 1:22   | Completed.                                                                                    |
| あいみょん - マリーゴールド  | 1:31   | Completed.                                                                                    |

The operator decided not to repeat the 踊り子 run.
The operator did not record which step took the most time in each run.

## Setup

- **Date:** 2026-09-30, from about 21:50 to 22:02 KST, from the page-load times in the usage log's request IDs and the log's last write.
- **Device:** iPhone 18 Pro simulator, iOS 27.0, freshly installed, so no practice or pronunciation was saved; the device's languages are `en-KR`, then `ko-KR`.
- **App:** Debug build of `main` at `a361b5c`, built for the simulator as the README shows.
- **Server:** the development pronunciation server from the same commit, with `gpt-5.4-mini-2026-03-17`.
- **Operator:** Andrew, viewing the simulator in Xcode 27's DeviceHub, with a stopwatch.
- **Search input:** each `<artist> - <title>` was pasted in Japanese from the Mac.
  Paste from the Mac had stopped working after a load spike on the machine, and it worked again after the simulator was rebooted.
- **Machine load during the runs:** not recorded.

## Observations

- **Default pronunciation language:** the page picks the device's first language for **읽을 언어**, so on this `en-KR` device it starts as English.
  That caused the 踊り子 mistake; on a device whose first language is Korean it starts as Korean.
- **Age restriction:** repeating the app's search request (`maxResults=1`, embeddable, syndicated) returned the official music video `x8VYWazR5mE` for `YOASOBI 夜に駆ける`, whose `ytRating` is `ytAgeRestricted`.
  The query `YOASOBI yoru ni kakeru` returned the Topic upload `by4SYYWlhEs`, which has no age rating.
  The page takes only the first result, so the user cannot pick another video; #70 tracks the fix.
- **Completed runs:** all three exceed 60 seconds by 16 to 31 seconds.
  The [service latency note](2026-09-29-first-sing-timing.md) measured about 4.5 to 6.8 seconds of service time before the first pronounced lines, so most of the time is in the person's steps, app launch, and player readiness, which this run did not separate.

## Usage

`node server/usage.mjs` on `server/build/pronunciation-usage/2026-09-30T11-08-26-749Z.jsonl`:

| Song             | Target | Requests | Failed | Lines sent | Input tokens | Output tokens |
| ---------------- | ------ | -------- | ------ | ---------- | ------------ | ------------- |
| 踊り子 (mistake) | `en`   | 5        | 0      | 50         | 4,684        | 3,621         |
| 踊り子           | `ko`   | 5        | 0      | 50         | 4,684        | 3,515         |
| Pretender        | `ko`   | 5        | 0      | 52         | 4,553        | 3,275         |
| 白日             | `ko`   | 7        | 0      | 82         | 6,263        | 4,701         |
| マリーゴールド   | `ko`   | 4        | 0      | 47         | 3,705        | 2,993         |
| Total            |        | 26       | 0      | 281        | 23,889       | 18,105        |

No request used cached or reasoning tokens.
The log names songs only by page run; the songs above follow the order of the runs and their line counts, which match the service latency note.

## Limits

- A simulator on the development Mac, not a physical iPhone: a physical iPhone cannot generate pronunciation until the hosted path (#50 to #52) exists.
- One operator, one run per song, and no per-step times.
- The Android runs are recorded separately.
