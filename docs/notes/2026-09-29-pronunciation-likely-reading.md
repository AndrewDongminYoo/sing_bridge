# Most likely reading for uncertain Japanese phrases

Issue: #40.
Follows the [review-flag rerun](2026-09-29-pronunciation-review-flags.md), where four of 16 batches came back flagged with no pronunciation at all.

## Decision

On 2026-09-29 the operator decided that, because Japanese kanji readings depend on meaning, the model should give its most likely pronunciation for an uncertain Japanese phrase and flag it for review, instead of returning none.
Since #39, the server and the page keep a flagged pronunciation and show the row with a `발음 확인 필요` label.

## Change

The prompt in `server/pronunciation.mjs` no longer tells the model to use `pronunciation=null` for ambiguous phrases or to avoid inventing sung readings for ambiguous kanji.
It now says:

- `und` marks a phrase whose language is unsupported or cannot be identified, and always carries `needsReview=true` and `pronunciation=null`.
- Every `ja`, `en`, or `es` phrase outside the target language needs a pronunciation.
- When a Japanese reading is uncertain, the model chooses the most likely reading from the phrase and neighboring lines, gives its pronunciation, and sets `needsReview=true`.
- Review is decided per phrase, never for a whole batch of lines.

The validator is unchanged.
`server/pronunciation.test.mjs` asserts the new wording and the absence of the old null rule; the new assertions fail against the previous prompt (14 pass, 1 fail) and pass with the new one (15 of 15).

## Paid rerun

From 11:49 to 11:50 UTC, the one-off script from the [#29 batch rerun](2026-09-29-pronunciation-batch-rerun.md) sent the same three songs as the review-flag rerun through `server/index.mjs` on this branch, based on `35dfa11`, with the `ko` target.
It used the same method: YouTube search `<artist> <title>`, the synced LRCLIB record closest to the video duration, a copy of the page's `parseTimedLyrics`, and the page's batches of up to 12 lines and 3,000 characters, sent one after another.
It printed timings, record IDs, and counts only; no lyric text or key was printed or stored.

| Song                        | LRCLIB record | Batches | Segments | Flagged | Flagged with pronunciation | Segments without pronunciation | All batches |
| --------------------------- | ------------- | ------- | -------- | ------- | -------------------------- | ------------------------------ | ----------- |
| YOASOBI - 夜に駆ける        | 6918922       | 5       | 57       | 1       | 1                          | 0                              | 25.5 s      |
| King Gnu - 白日             | 10428545      | 7       | 82       | 4       | 4                          | 0                              | 30.2 s      |
| あいみょん - マリーゴールド | 11839819      | 4       | 51       | 12      | 12                         | 0                              | 21.9 s      |

All 16 batches returned HTTP 200, and every one of the 190 segments carried a pronunciation; no segment was `und`.
The completion condition of #40, no batch without any pronunciation, is met in this run.

The per-batch rule was not fully followed: every segment of マリーゴールド batch 2 was flagged.
Those 12 lines now show a pronunciation with the review label instead of no pronunciation.

## Cost and time

| Song                        | Requests | Lines sent | Input tokens | Cached input tokens | Output tokens | Reasoning tokens |
| --------------------------- | -------- | ---------- | ------------ | ------------------- | ------------- | ---------------- |
| YOASOBI - 夜に駆ける        | 5        | 56         | 4,217        | 0                   | 3,767         | 0                |
| King Gnu - 白日             | 7        | 82         | 5,686        | 0                   | 4,526         | 0                |
| あいみょん - マリーゴールド | 4        | 47         | 3,358        | 0                   | 3,070         | 0                |

All 16 requests used `gpt-5.4-mini-2026-03-17`, and none failed.
Compared with the #29 batch rerun on `54d9865`, input tokens rose by about 221 per request for every song, which matches a fixed change in instruction length since that commit (#36 and this change); output tokens rose by 12% to 14%.
Full songs took 21.9 to 30.2 seconds instead of 12.5 to 18.8 seconds; this run does not show whether that comes from the longer output, the prompt, or provider variance.

## Limits

Model output varies between calls, so these counts describe one run.
The run shows that pronunciations are present, not that they are correct; the reviewer edit rate in #21 measures that.
No native WebView run was made.

Two wording limits remain, left unchanged because the paid run above tested this exact prompt:

- "never for a whole batch" also forbids flagging every line of a batch when each one is uncertain, and the model did not follow it for マリーゴールド batch 2.
- The most-likely-reading rule names Japanese kanji; an uncertain `en` or `es` phrase has no explicit instruction to flag, whereas the previous prompt flagged ambiguous phrases in any language.

Changing either needs another paid rerun.
