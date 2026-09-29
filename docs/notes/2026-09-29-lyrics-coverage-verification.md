# LRCLIB coverage check verification

Scope: [LRCLIB coverage check](../specs/2026-09-29-lyrics-coverage.md), issue #19.

## Tests

`node --test tools/lyrics-coverage/coverage.test.mjs` passes 14 tests with fixture responses and no network access.
Against an inert stub that exported the same functions, all 14 failed; one test first passed against the stub and was strengthened to require that malformed records are dropped while a valid one is kept.
The tests cover the app's query and client header, duration-tolerance classification, the 20-candidate display limit, malformed-record filtering, the absence of lyric text in the report, the summary denominator, ending the run on HTTP 429, sequential requests, the 4 MiB response limit, list validation, and the CLI exiting with status 2 on invalid input.
Scoped `trunk check --no-fix` passed for the tool, spec, AGENTS.md, and CI workflow.

## Review fixes

Hosted review on PR #27 reported five P2 findings, all confirmed against the code: the tolerance compared a rounded difference, JSON parser messages could quote response text into the report, `--out` into a missing directory failed after every request, a long `Retry-After` was cut to two minutes and retried early, and an option without a value was ignored.
Five regression tests failed before the fixes (14 passing), and all 19 pass afterwards.
A local `codex exec review --base origin/main` then found that a rate limit on one song did not stop the next request one second later; a run-wide stop was added, its regression failed first, and all 20 tests pass.
The second hosted round found that an overflowing numeric `Retry-After` fell back to a 60-second retry.
That was the third guard on the same retry path, so the retry was removed instead: the first 429 now ends the run with no header parsing.
The four retry tests were replaced by one that covers short, long, overflowing, and missing headers; it failed against the retrying code, and all 18 tests pass.

## Live smoke run

One run on 2026-09-29 at 06:33 UTC queried two songs; this is a smoke check of the live path, not the Gate A measurement.

| Song                 | Duration given | Status   | Top candidate                                               |
| -------------------- | -------------- | -------- | ----------------------------------------------------------- |
| Vaundy - 踊り子      | 246 s          | `synced` | LRCLIB `35902952`, 246 s, difference 0 s                    |
| YOASOBI - 夜に駆ける | none           | `synced` | LRCLIB `35766443`, titled `YOASOBI 夜に駆ける(inst)`, 262 s |

The second row is a false match by title: without a duration, the first synced record in provider order counted, and it was named as an instrumental version.
The README now asks for a duration on every song in a gate run.
The report file contained no `syncedLyrics` or `plainLyrics` field; it was kept outside the repository.

## Remaining

The Gate A run needs the operator-approved 30-song list with a duration for each song, followed by a person confirming each `synced` match.
