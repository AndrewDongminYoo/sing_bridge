# Offline Japanese reading comparison

This developer tool compares a supplied phrase reading with kuromoji's Japanese dictionary candidates.
It does not generate Hangul pronunciation, identify mixed-language boundaries, call an AI service, or modify the app's saved pronunciation.
A dictionary match is not evidence of correct sung pronunciation.

## Run

Use Node 22 or later from the repository root:

```sh
npm ci --ignore-scripts --prefix tools/pronunciation-quality
npm test --prefix tools/pronunciation-quality
node tools/pronunciation-quality/evaluate.mjs --check
```

Installation requires the package registry; tests and evaluation use only the installed local dictionary.
The lockfile pins the complete dependency graph.
The engine is isolated from mobile builds and the development server.

To inspect your own local samples without an expected-result gate:

```sh
node tools/pronunciation-quality/evaluate.mjs /absolute/path/to/cases.json
```

Input contains version 1 and up to 100 uniquely identified phrase cases, with at most 500 source characters per phrase and a 1 MiB file limit:

```json
{
  "version": 1,
  "cases": [
    {
      "id": "example",
      "language": "ja",
      "source": "青い空",
      "modelReading": "あおいそら",
      "expected": "reference_match"
    }
  ]
}
```

`modelReading` is a source-language reading, not the final Hangul or English pronunciation display.
It can be null or omitted; such cases are unassessable.
`expected` is required only with `--check` and describes the comparison outcome, not linguistic correctness.
Keep mixed-language phrase boundaries supplied by the model or reviewer; non-Japanese phrases and mixed-script Japanese phrases are not compared.
The checked-in cases are original phrases with synthetic candidate readings, including deliberate mistakes; they are not measured AI responses.

## Report

The CLI emits JSON to stdout, with engine and Node versions, one dictionary-load duration, per-phrase timings, source-preserving token evidence, reference candidates, and comparison outcomes.
Each timing is a single local measurement, not a stable performance guarantee.

| Outcome | Meaning |
| --- | --- |
| `reference_match` | Normalized model reading matches either the dictionary lexical reading or pronunciation candidate. |
| `reference_difference` | Comparable readings differ; inspect both rather than automatically replacing one. |
| `unassessable` | Unsupported language/script, missing reading, unknown token, or incomplete dictionary evidence. |

Normalization unifies kana width, composed voicing marks, and hiragana/katakana; it removes punctuation and whitespace.
It retains prolonged sound marks, geminates, and voicing distinctions.
It does not equate every possible long-vowel spelling or alternate reading.
Unknown tokens are conservatively excluded even if a person could infer their reading.
`dictionaryReading` and `dictionaryPronunciation` stay null when the tool cannot establish complete dictionary coverage; individual tokens still show available evidence when tokenization was attempted.

`coverage` divides comparable cases by all cases.
`agreementAmongComparable` divides matches by comparable cases, or is null when no comparison is possible.
Neither value is pronunciation accuracy, and the synthetic case mix deliberately includes disagreement and unsupported input.

Exit codes:

- `0`: report produced and any supplied check baselines matched.
- `1`: `--check` found a baseline mismatch; the report includes mismatching IDs.
- `2`: invalid input, usage, file access, or engine failure.

## Dependencies and notices

The installed package declares kuromoji 0.1.2 under Apache-2.0.
Its bundled MeCab IPADIC data has separate NAIST/ICOT notice conditions in `node_modules/kuromoji/NOTICE.md`.
Preserve the engine license and dictionary notices if redistributing the package or dictionary.
The package is installed intact; no dictionary assets are vendored into this repository or shipped in the app.

See [the approved plan](../../docs/plans/2026-09-28-pronunciation-reference-check.md) for pinned upstream sources and [verification](../../docs/notes/2026-09-29-pronunciation-reference-verification.md) for observed limits.
