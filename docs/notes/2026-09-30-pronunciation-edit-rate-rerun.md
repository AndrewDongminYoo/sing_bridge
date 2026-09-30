# Reviewer edit rate on 10 songs, after regenerating one song

Issue: #21.
Target: a fluent reviewer leaves at least 90% of lines unedited across 10 songs, measured with reviewer edits in the existing edit flow on authorized or original samples (Gate A in the [competitive brief](2026-09-29-competitive-brief.md)).

This note follows the [first development run](2026-09-30-pronunciation-edit-rate-measurement.md), which left 12 known wrong lines of ただ声一つ unedited.
That note stays as the record of its run; this note records what changed afterwards and the new report.

## Decision

On 2026-09-30, after the first run, the operator decided:

- The Gate A sample condition follows the answers to #17; no separate authorized or original sample set is prepared before then.
- Before that, the 12 Latin-letter lines of ただ声一つ are regenerated with the #56 fix (PR #61) on the server, and the review is repeated under the protocol, correcting every wrong line.
- The operator stays the reviewer for now.

## What changed

- **Server:** the pronunciation server ran from `baa6479`, which includes PR #61, so the server drops a pronunciation written in the wrong script.
- **App:** the same build as the first run, still installed on the iOS Debug simulator (iPhone 17 Pro, iOS 27.0); it was not rebuilt, because PR #61 changed only the server.
- **Regeneration:** the page sends only lines that have no pronunciation yet, and it loads a saved layer when the practice opens, so a saved layer cannot be partly regenerated in the app.
  The reviewer deleted the saved practice for ただ声一つ, searched the song again, chose the same LRCLIB record (35674678), generated Korean-target (`ko`) pronunciation for all 30 lines, and saved with **음차 저장**.
  So the first 18 lines were also regenerated.
- **Review:** the reviewer read all 30 regenerated lines of ただ声一つ and found no line to correct, so no edit was saved.
  The other 9 songs keep their first-run review, in which the reviewer read every line and found none to correct; only ただ声一つ deviated from the protocol.

## Checks

- The app was stopped and its storage copied read-only, as the protocol in `tools/pronunciation-quality/README.md` shows, once after regeneration and once after the review.
  The two copies of the saved library had the same SHA-256, so the review saved no change.
- A script check of the saved layers, which printed counts only, found no segment whose pronunciation has Latin letters and no Hangul, in any of the 10 layers; in the first run, lines 13 to 24 of ただ声一つ had one.
  The same check returned true for a Latin sample and false for a Hangul sample.
- Two segments of LADY are classified `ja` without a pronunciation; each is a single punctuation character with a review flag, which the tool excludes from phrases without pronunciation.

The extracted library, which contains lyrics, was kept only in a temporary directory outside the repository and never committed.

## Tool report

`edit-rate.mjs` ran with the 10 layers named as `--reviewed <lyricId>:ko`.

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
This time no known wrong line was left unedited, so the editing deviation of the first run is gone; because the protocol asks for a fluent reviewer and the reviewer's fluency was not assessed, the ratio is the operator's development edit rate, not yet the reviewer edit rate that the protocol defines.

## Gate A status

Not established:

- **Samples:** the 10 songs are commercial recordings with lyrics from LRCLIB, and #17 has not answered the licensing questions; by the decision above, whether these songs count waits for those answers.
- **Reviewer:** the fluency that Gate A asks of the reviewer was not assessed.

The first run's protocol reason, 12 known wrong lines left unedited, no longer applies.

## Signals

- **Review flags:** 24 lines carried a review flag, the same count as the first run, since ただ声一つ had none either time; the reviewer edited none of them.
- **Phrases without pronunciation:** 0 in all 10 layers.

## Usage

| Usage log                  | Requests | Failed | Lines sent | Input tokens | Output tokens |
| -------------------------- | -------- | ------ | ---------- | ------------ | ------------- |
| `2026-09-30T09-37-38-805Z` | 3        | 0      | 30         | 2,700        | 1,937         |

All requests used `gpt-5.4-mini-2026-03-17` with no cached or reasoning tokens; the server sends requests with `store: false`, and OpenAI's own retention policies still apply.

## Limits

- One reviewer, who is also the operator, reviewed one generation per song; model output varies between calls.
- The reviewer read the 9 other songs in the first run and ただ声一つ in this one, from two generations made on the same day with the same model and prompt; between them only the server's check of the result changed (PR #61).
- The Latin-letter check detects the wrong script, not wrong readings; other errors rest on the reviewer's reading.
