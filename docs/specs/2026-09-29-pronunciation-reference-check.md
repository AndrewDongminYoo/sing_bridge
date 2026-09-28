# Offline pronunciation reference contract

## Scope

Implement the operator-approved [Japanese reading comparison plan](../plans/2026-09-28-pronunciation-reference-check.md) as a separate Node tool.
The existing server validator checks response structure; the new tool provides independent dictionary candidates for developer inspection.
No result is an automatic judgment of sung pronunciation or final Hangul quality.
Original fixtures and synthetic readings keep evaluation offline and avoid paid AI calls.

## Acceptance

- Preserve input source, IDs, supplied phrase language, and model reading in the report.
- Compare only Japanese phrases with complete known-token dictionary evidence and a comparable kana model reading.
- Accept either the dictionary lexical reading or pronunciation after conservative normalization.
- Preserve long vowels, geminates, and voicing distinctions.
- Report a difference without declaring either candidate correct.
- Report missing readings, unknown words, unsupported scripts/languages, and incomplete tokenization as unassessable.
- Separate comparison coverage from agreement; never call either accuracy.
- The CLI emits JSON and exits nonzero for invalid input or a mismatched expected fixture.
- Pin the engine and resolved graph; retain upstream license and dictionary notices through the installed package.
- Run offline tests and a deliberately failing baseline check in CI-compatible Node tests.

## Additional UI scope

The operator requested removal of repeated AI/language labels beneath each lyric during this implementation.
Preserve language metadata and per-phrase accessible labels, uncertain-reading underlines, and the user-edited marker.
Explain AI generation and uncertain underlines in lyric settings.
No storage or response schema changes are needed.

## Out of scope

Production server gating, Japanese-to-Hangul rendering, automatic language identification, additional language engines, live model evaluation, and mobile dictionary packaging require a later decision.
Personal project Oracle returned `[no precedent found]`.
