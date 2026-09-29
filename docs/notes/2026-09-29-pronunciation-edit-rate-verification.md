# Pronunciation edit-rate report verification

Issue: #21.
Tool usage and the measurement protocol are in [the tool README](../../tools/pronunciation-quality/README.md#measure-the-reviewer-edit-rate).

## Tests

`edit-rate.test.mjs` adds seven tests using original synthetic phrases and a sentinel string.
Against an inert stub all seven failed; the privacy test first passed against the empty stub report and was strengthened to require a song in the report.
They cover per-song counts (text, generated, missing, edited, unedited, review-flagged lines), an edit equal to the generated text, the absence of lyric and pronunciation text in the report, skipping items without saved pronunciation, totals across songs and targets, input validation, UTF-8 and UTF-16LE CLI input, and exit status 2 without echoing invalid input.
`npm test --prefix tools/pronunciation-quality` passes; `package.json` changed only its test script, and `npm install --package-lock-only` left the lockfile unchanged.

## Real-data smoke run

On 2026-09-29 the booted iOS 27 simulator's WebKit storage for the app was copied to a scratch directory, and the `singbridge.practice.v1` value was extracted with `sqlite3` as the README describes; the original container was not modified.
Only structure and counts were inspected.
The library held one saved song, `Vaundy - odoriko` (LRCLIB 35923881), with a Korean layer: 56 lines with text, 56 generated, 0 edited, and 21 lines carrying a review flag.
The unedited ratio of 1.0 reflects that no reviewer had edited this song, which is the limit the README states: the app does not record that a review happened.

## Remaining

The Gate A measurement still needs a fluent reviewer to review 10 authorized or original songs under the README protocol.
