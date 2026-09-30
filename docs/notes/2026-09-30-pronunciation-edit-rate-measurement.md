# Reviewer edit rate on 10 songs

Issue: #21.
Target: a fluent reviewer leaves at least 90% of lines unedited across 10 songs (Gate A in the [competitive brief](2026-09-29-competitive-brief.md)).
Protocol: "Measure the reviewer edit rate" in `tools/pronunciation-quality/README.md`.

## Setup

- **Reviewer:** the operator, on 2026-09-30, reading Japanese.
- **Songs:** the first 10 songs of the approved list (`tools/lyrics-coverage/songs-2026-09.json`, PR #49) by chart rank whose synced match was not flagged as false in the [coverage gate run](2026-09-30-lyrics-coverage-gate-run.md).
- **App:** the SingBridge build already installed on the iOS Debug simulator (iPhone 17 Pro, iOS 27.0), which the session that installed it reported as the PR #48 build (`55fba29`); `git log 55fba29..3241345` shows no change under `shared`, `iosApp`, `androidApp`, or `server`, and `3241345` ran the pronunciation server.
- **Flow:** the reviewer searched each song, chose the listed LRCLIB record, generated Korean-target (`ko`) pronunciation in the app, read every line, and saved with **음차 저장**.
- **Extraction:** the app was stopped, WebKit storage was copied read-only as the README shows, and `edit-rate.mjs` ran with the 10 layers named as `--reviewed <lyricId>:ko`.
  The extracted library stayed under the ignored `build/` directory of the measurement worktree and is to be deleted by the operator, because it contains lyrics.

No lyric or pronunciation text was printed or stored outside the app and that temporary copy.

## Tool report

| LRCLIB ID | Song                                        | Lines | Generated | Edited | Review-flagged lines | Phrases without pronunciation |
| --------- | ------------------------------------------- | ----- | --------- | ------ | -------------------- | ----------------------------- |
| 34678411  | Official髭男dism - Pretender                | 52    | 52        | 0      | 0                    | 0                             |
| 36513119  | tuki. - 晩餐歌                              | 42    | 42        | 0      | 2                    | 0                             |
| 9908302   | 米津玄師 - Lemon                            | 39    | 39        | 0      | 5                    | 0                             |
| 26600318  | 米津玄師 & 宇多田ヒカル - JANE DOE          | 21    | 21        | 0      | 0                    | 0                             |
| 35549827  | Novelbright - Walking with you              | 39    | 39        | 0      | 0                    | 0                             |
| 35902952  | Vaundy - 踊り子                             | 50    | 50        | 0      | 4                    | 0                             |
| 33679367  | imase - NIGHT DANCER                        | 43    | 43        | 0      | 3                    | 0                             |
| 35613348  | SPYAIR - サムライハート(Some Like It Hot!!) | 48    | 48        | 0      | 1                    | 0                             |
| 35674678  | ロクデナシ - ただ声一つ                     | 30    | 30        | 0      | 0                    | 0                             |
| 35057582  | 米津玄師 - LADY                             | 35    | 35        | 0      | 9                    | 0                             |

`totals.ko`: 10 songs, 399 lines with text, 399 generated, 0 edited, 399 unedited, 0 phrases without pronunciation, and an unedited ratio of 1.

## Lines that were wrong but not edited

The report counts edits, and the reviewer made none, so the ratio of 1 does not by itself mean every line was right.
The reviewer stated that the second half of one song was pronounced in Latin letters and left unedited because correcting it line by line was impractical, and that the other lines needed no correction.
A script check of the saved layers, which printed counts only, found exactly one such block: in ただ声一つ, lines 13 to 24 of 30, the whole second 12-line batch, have a pronunciation with Latin letters and no Hangul, and every segment in them is classified `ja`.
No other segment in the 10 layers has a Latin-only pronunciation.
The defect is filed as #56.

Counting those 12 lines as wrong, 387 of 399 lines (97.0%) were correct as generated, above the 90% target.
The measured ratio rests on the reviewer's reading, not on edits, so the note records both numbers: 399 of 399 unedited by the tool, and 387 of 399 correct by the reviewer's account.

## Signals requested in #21

- **Review flags:** 24 lines carried a review flag, and the reviewer found none of them wrong; the 12 wrong lines carried no flag.
  So in this run the flags neither marked the actual error nor pointed at lines that needed correction.
- **Phrases without pronunciation:** 0 in all 10 layers, so the #43 case did not occur.

## Generation

- One request of the first pass for Walking with you failed after it was billed, and the page stopped, leaving 15 of 39 lines without pronunciation; the reviewer generated again from the saved practice, which sent only those 15 lines, and reviewed them.
- The server stopped twice during the session (a session exit and a background time limit) and was restarted, so usage is split across three logs.

| Usage log                  | Requests | Failed | Lines sent | Input tokens | Output tokens |
| -------------------------- | -------- | ------ | ---------- | ------------ | ------------- |
| `2026-09-30T02-50-23-740Z` | 27       | 1      | 283        | 24,859       | 20,131        |
| `2026-09-30T03-20-49-363Z` | 10       | 0      | 113        | 9,435        | 8,561         |
| `2026-09-30T03-33-41-852Z` | 2        | 0      | 15         | 1,712        | 1,108         |
| Total                      | 39       | 1      | 411        | 36,006       | 29,800        |

All requests used `gpt-5.4-mini-2026-03-17` with no cached or reasoning tokens.
The 411 lines sent include the 12 lines of the failed batch, so 399 lines were generated.

## Limits

- One reviewer, who is also the operator, reviewed one generation per song; model output varies between calls.
- The 10 songs are the highest-ranked eligible ones on one chart, so the result may differ for other songs.
- The Latin-letter check detects the wrong script, not wrong readings; other errors rest on the reviewer's reading.
