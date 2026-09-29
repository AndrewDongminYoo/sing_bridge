# Spanish pronunciation source verification

Issue: #23.

## Change

`es` (Spanish) is a source phrase language on the server and in the page, for both reading targets, Korean and English.
The server keeps one language list for validation and the JSON schema, and the page keeps one table for re-validation and the displayed names.
The prompt names `es` as Spanish, gives spelling and word cues so Latin script is not read as English, and gives Spanish-to-Hangul rules that follow Korean loanword spelling (for example `mañana` = 마냐나, `gente` = 헨테, `corazón` = 코라손, `amor` = 아모르).
Each lyric row with a Spanish phrase shows a visible `스페인어(실험)` label, because touch WebViews show no tooltip; a row the user edited shows `직접 수정` instead.
Andrew approved widening the target user from Japanese lyrics to foreign-language lyrics with Spanish as an experiment on 2026-09-29, as #23 required.

## Checks

Four new tests failed before the change and pass after it: Spanish phrases accepted for both targets, Spanish review rules matching the other foreign languages, `es` in the provider schema and instructions, and a Spanish layer rendering as experimental and restoring from a saved practice.
The Spanish test phrases were written for this project.
The first hosted review round on PR #36 found that the experimental name appeared only in the phrase tooltip and that two prompt sentences had lost the space after their period; the visible-label test and the sentence-boundary assertion failed first and pass after the fix.
`node --test tools/test-youtube.mjs server/pronunciation.test.mjs` passed 125 of 125 tests, and `npm test --prefix tools/pronunciation-quality` passed 34 of 34 with `evaluate.mjs --check` exiting 0.
No paid request was made.

## Limits

Spanish stays experimental until a Spanish reviewer runs the Gate A accuracy measurement; that measurement keeps #23 open.
Real model output for Spanish lyrics has not been checked.
Hangul cannot show the difference between r and rr, so both use ㄹ, as in Korean loanword spelling.
The offline reference tool compares Japanese dictionary readings only; `tools/pronunciation-quality/reference.mjs` reports Spanish phrases as unassessable with the reason `unsupported_language`.
