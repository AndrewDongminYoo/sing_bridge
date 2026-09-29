# Read-only context lines at pronunciation batch boundaries

Issue: #42.
Follows the [most-likely-reading change](2026-09-29-pronunciation-likely-reading.md), whose prompt asks the model to use neighboring lines that a batch did not contain at its edges.

## Change

- The server request accepts an optional `context` object with `before` and `after` lists of up to two non-empty lines each, at most 500 characters per line.
  Context lines have no IDs, are not counted toward the 12-line and 3,000-character batch limits, and are not part of the line-ID and source checks, so a result can never return them.
- The prompt says that the context lists are read-only lyric lines next to the batch, used only to decide languages and readings, and never returned as lines.
- The page (`pronunciationContext` in `YouTubePronunciation.kt`) sends, for each batch, up to two non-blank lines before its first line and after its last line, taken from the full lyric list, so lines generated earlier still serve as context.
- The native bridges are unchanged; they already pass the request object through under their 32,768-byte limit.
- Tests without paid calls: `server/pronunciation.test.mjs` covers accepted and rejected context shapes, the batch limits without context, the provider input, and a result that tries to return an extra line; `tools/test-youtube.mjs` covers the context of two batches around a blank line.

## Paired paid rerun

From 12:40 to 12:42 UTC, a one-off Node script sent every batch of the same three songs as the #40 rerun twice through `server/index.mjs` on this branch (based on `3c5e00e`, `ko` target): once without context and once with the page's context.
Which variant went first alternated per batch.
It used the method of the [#29 batch rerun](2026-09-29-pronunciation-batch-rerun.md), with the page's context selection copied, and printed counts only; no lyric text or key was printed or stored.

A boundary line is the first line of a batch that had lines before it, or the last line of a batch that had lines after it; every other line is interior.
A line changed when its rendered pronunciation (pronunciation, or source where none) differed between the two variants.

| Song                        | LRCLIB record | Batches | Boundary lines changed | Interior lines changed | Flagged lines, without / with context | Lines missing a pronunciation |
| --------------------------- | ------------- | ------- | ---------------------- | ---------------------- | ------------------------------------- | ----------------------------- |
| YOASOBI - 夜に駆ける        | 6918922       | 5       | 5 of 8                 | 23 of 48               | 0 / 24                                | 0                             |
| King Gnu - 白日             | 10428545      | 7       | 9 of 12                | 33 of 70               | 1 / 3                                 | 0                             |
| あいみょん - マリーゴールド | 11839819      | 4       | 4 of 6                 | 24 of 41               | 0 / 0                                 | 0                             |
| Total                       |               | 16      | 18 of 26 (69%)         | 80 of 159 (50%)        | 1 / 27                                | 0                             |

All 32 requests returned HTTP 200 and none failed.

## Reading the numbers

Boundary lines changed more often than interior lines, 69% against 50%.
The 50% on interior lines mixes the model's call-to-call variation with any effect the context has on the whole batch, because the prompt applies the context to every line; no repeated run without context was made to separate the two, and 26 boundary lines are few, so the 69% against 50% difference is suggestive only.
This run therefore records that boundary lines change, as #42 asked, but does not show that context improves them; only a reviewer comparison could.

Flagged lines rose from 1 to 27 with context, 24 of them in 夜に駆ける.
Earlier runs of the same batches without context flagged whole batches too (the [#40 rerun](2026-09-29-pronunciation-likely-reading.md) flagged all of マリーゴールド batch 2), so one run cannot tell whether context causes more flags.
Every flagged line still had a pronunciation, so the page shows it with the review label rather than the original text.

## Cost

| Variant         | Requests | Input tokens | Output tokens |
| --------------- | -------- | ------------ | ------------- |
| Without context | 16       | 13,965       | 11,573        |
| With context    | 16       | 14,630       | 11,612        |

Context added 665 input tokens (4.8%), about 42 per request, and did not change output tokens noticeably.
All requests used `gpt-5.4-mini-2026-03-17` with no cached or reasoning tokens.

## Limits

Each variant ran once per batch, so the counts include model variation.
The run measures change, not correctness.
No native WebView run was made; the page behavior is covered by the Node tests.
