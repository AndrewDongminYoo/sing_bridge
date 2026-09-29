# Captured response evaluation verification

## Behavior evidence

The CLI tests spawn the actual evaluator with temporary request/result JSON files and load the installed kuromoji dictionary.
They verify segment-to-line mapping, preserved source and target pronunciation, separate model-review flags, and comparison summary denominators.
The mixed-language fixture uses original synthetic Japanese, English, and Korean phrases, not a measured AI response.
No paid generation or live lyric fetch occurred.

Before implementation, four response-mode tests failed because the CLI rejected the new mode.
Additional tests exposed rejection of valid whitespace-only server segments and JSON parser diagnostics that echoed a synthetic private-text sentinel.
After the fixes, `npm test --prefix tools/pronunciation-quality` passed all 21 tests.
The boundary test processes the full 12-by-40 segment server bound and rejects a 41st segment in a line.
The existing deliberately corrupted baseline still exits 1; response mode explicitly refuses `--check` because producing a report is not a quality verdict.

`node tools/pronunciation-quality/evaluate.mjs --check` retained the original 12-case baseline: three matches, four differences, and five unassessable cases.
`node --test tools/test-youtube.mjs server/pronunciation.test.mjs` passed all 94 existing tests.
Scoped Trunk checks passed for the applicable Markdown files; the Node tests execute the changed JavaScript.
`git diff --check` passed.

## Review and limits

A structured local review checked server-contract reuse, no generation call at module import, exact source reconstruction, unique segment identity, stable provenance, CLI flag isolation, missing and non-lexical readings, and preservation of model-review status.
No blocking defect remained in that review.
The app-facing response shape was checked against `server/index.mjs`, which sends the generated `result` object.

The adapter does not detect languages, judge final Hangul quality, or rewrite saved data.
Dictionary matches can coexist with a model-review flag and must not be treated as confidence scores.
Real sample evaluation and human judgment about false alarms remain necessary before any production gate.
No native code or UI changed, so no additional device build or visual approval was required locally.
Oracle retrieval returned `[no precedent found]`; no external precedent was used as approval.
