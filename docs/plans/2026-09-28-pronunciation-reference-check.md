# Pronunciation reference check

## Status

Approved on 2026-09-29 with the operator's instruction to proceed.
The operator previously requested an OSS engine as a quality reference for AI pronunciation.
The first implementation is an offline Japanese reading comparison tool; production gating remains a separate decision based on its results.
Personal project Oracle searches for reading validation and pronunciation quality returned `[no precedent found]`.

## Problem and boundary

`server/pronunciation.mjs` validates source reconstruction, IDs, language labels, field limits, and same-language handling.
It does not independently evaluate whether the model's reading or target pronunciation is phonetically correct.
The existing quality note records unresolved Japanese ambiguity and long-vowel spelling.
See [current evidence](../notes/2026-09-28-pronunciation-verification.md).

An OSS dictionary can provide an independent reading candidate, but disagreement is not proof that an AI response is wrong, especially for names, alternate readings, and sung pronunciation.
A Japanese reading match also does not validate the final Hangul rendering or English-friendly spelling.
The first tool must report these limits explicitly and must not replace saved user edits or silently suppress pronunciation.

## Recommended first slice

Add a separate Node evaluation tool under `tools/pronunciation-quality/` using pinned `kuromoji` with a committed lockfile.
Existing Node built-ins cannot supply Japanese kanji readings or morphological analysis; a dictionary-backed dependency is justified for this bounded evaluation.
Keep the dependency outside the application and production server until its value and costs are measured.
Use original short fixtures and explicitly supplied model-reading samples; do not fetch commercial lyrics or make paid AI calls.

For each Japanese phrase, retain the source, optional model reading, dictionary reading and pronunciation candidates, unknown-token evidence, and one comparison outcome:

- `reference_match`: a comparable model reading agrees with a dictionary candidate after conservative kana and punctuation normalization.
- `reference_difference`: comparable readings differ and need human inspection; neither is declared correct.
- `unassessable`: missing reading, unsupported script or language, unknown words, or incomplete dictionary coverage prevents a meaningful comparison.

Normalization may unify hiragana and katakana and ignore separators, but must not erase long vowels, geminates, or voicing differences.
Mixed-language input must retain its supplied phrase boundaries; this tool does not claim to identify English versus romanized Japanese.
Report supported comparison coverage separately from agreement, and never label either metric as singing accuracy.

## Implementation and checks

1. Add package metadata, exact engine version, and lockfile; verify installation with `npm ci --prefix tools/pronunciation-quality` and inspect the resolved runtime dependencies and license notices.
2. Write failing Node tests for reading agreement and difference, kana normalization, preserved long vowels and geminates, missing reading, unknown words, mixed/unsupported text, and unchanged source input.
3. Implement one engine adapter and a CLI that reads local fixtures and emits a JSON comparison report; reuse Node's built-in test runner.
4. Run the real dictionary on the original cases, record startup time, per-case processing time, installed size, and cases that cannot be compared.
5. Make a deliberately corrupted expected fixture fail before accepting the baseline report; test failures must concern reading behavior rather than missing modules.
6. Add the offline tests to CI with `npm ci` followed by `npm test --prefix tools/pronunciation-quality`; run the existing server and shared-page tests to confirm that the evaluation tool is isolated.
7. Review the measured result before proposing server integration, a Japanese-to-Hangul renderer, or another source language.

Expected files: `tools/pronunciation-quality/{package.json,package-lock.json,reference.mjs,reference.test.mjs,evaluate.mjs,cases.json,README.md}`, one scoped CI step, and a verification note.
No mobile build is required for this tool-only slice; it does not alter shipped Kotlin, Swift, HTML, or the server response contract.

## Additional UI request

During implementation, the operator separately requested removing the repeated AI and language label below every lyric.
Apply that small change in `YouTubePronunciation.kt` with a separate commit, preserving phrase language data, accessible phrase labels, review underlines, and the explicit user-edited marker.
Keep AI disclosure and the underline explanation in lyric settings.
Verify the shared-page tests and rendered pronunciation rows; hosted CI also compiles the mobile hosts.

## Evidence and adoption risks

The inspected upstream source exposes token `reading`, `pronunciation`, and `KNOWN`/`UNKNOWN` fields and supports Node dictionary loading.
Its package metadata declares version `0.1.2` and Apache-2.0, with dictionary conditions documented separately in `NOTICE.md`.
These observations establish a candidate interface, not a tested compatibility or security verdict.
Inspect the actually installed package and its resolved dependencies before adoption; stop rather than add an unreviewed override if that check finds a blocker.

Sources inspected on 2026-09-28 at upstream commit `71ea8473bd119546977f22c61e4d52da28ac30a6`:

- [Node usage and token fields](https://github.com/takuyaa/kuromoji.js/blob/71ea8473bd119546977f22c61e4d52da28ac30a6/README.md)
- [Package metadata](https://github.com/takuyaa/kuromoji.js/blob/71ea8473bd119546977f22c61e4d52da28ac30a6/package.json)
- [Dictionary notices](https://github.com/takuyaa/kuromoji.js/blob/71ea8473bd119546977f22c61e4d52da28ac30a6/NOTICE.md)
