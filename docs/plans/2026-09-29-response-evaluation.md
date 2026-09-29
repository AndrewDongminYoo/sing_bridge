# Captured response evaluation plan

## Direction and scope

The operator requested continued implementation after approving and merging PR 11.
Continue the approved diagnostic direction by making existing server responses directly assessable offline, before any production gate.
The previous measurement recommends real authorized samples and human review; this adapter prepares that input path without making paid requests.
Oracle retrieval for reading validation and response evaluation returned `[no precedent found]`.

## Implementation

1. Add end-to-end CLI regressions for a mixed Japanese, English, and Korean response, stable source/segment mapping, model-review retention, and missing readings.
2. Observe failures because response mode is absent; include malformed captures and CLI flag misuse.
3. Add a small capture adapter that reuses server validators and converts each segment into a reference case with explicit provenance.
4. Add report-only response mode to `evaluate.mjs`, preserving the existing fixture baseline path and metrics.
5. Verify valid 480-segment server batches, rejection above server bounds, source tampering, line reordering, and no echoed private input on errors.
6. Run the complete offline tool suite and existing server/page suite, scoped Trunk checks, and one structured local review.
7. Commit and open a PR through the continuing PR loop; verify current-head Code Review, Security Review, and CI before requesting operator merge.

## Success checks

- Capture parsing and comparison behavior: `npm test --prefix tools/pronunciation-quality`.
- Existing corpus behavior: `node tools/pronunciation-quality/evaluate.mjs --check`.
- Server contract and app-page regressions: `node --test tools/test-youtube.mjs server/pronunciation.test.mjs`.
- Quality checks: `trunk check --no-fix` restricted to changed paths.
- No native UI changes; additional visual approval is not applicable.
