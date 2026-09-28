# Captured pronunciation evaluation

## Contract

Extend the offline reading diagnostic to accept one local JSON envelope with exactly `version: 1`, `request`, and `result`.
The request and result use the existing pronunciation server contract, not an OpenAI HTTP envelope or saved-library format.
Reuse `validateRequest` and `validateResult` before comparing anything so changed source text, mismatched IDs, unsupported targets, invalid review handling, and oversized batches fail closed.

Preserve each segment's line ID, zero-based segment index, language, source, reading, final pronunciation, and `needsReview` flag.
Compare each segment separately without detecting or merging language boundaries.
Missing readings and non-Japanese segments remain unassessable.
A dictionary match can coexist with `needsReview: true`; retain and count that flag separately so agreement cannot be mistaken for model confidence or approval.

Add explicit `--response` report-only mode to the existing CLI.
Require an explicit input file and reject combining it with `--check` or duplicate flags.
Retain the 1 MiB file bound, with segment count bounded by the server's 12 lines and 40 segments per line.
Do not apply the legacy 100-case fixture limit to valid server captures.
Response reports identify their input kind and target, and expose model-review counts alongside existing comparison metrics.
Exit 0 means a report was produced, not that pronunciation is correct.
Invalid captures exit 2 without echoing the supplied source text.

## Boundaries

No paid calls, automatic capture, new dependencies, production server changes, prompt changes, UI changes, or saved-edit changes.
Reports contain supplied text and remain local unless the operator explicitly shares them.
Tests use original synthetic responses and the real installed dictionary; they establish adapter behavior rather than model accuracy.
