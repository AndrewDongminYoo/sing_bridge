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

## Evaluate a captured server response

Place one authorized request and its corresponding validated server result in a local JSON file:

```json
{
  "version": 1,
  "request": {
    "target": "ko",
    "lines": [{ "id": "line-0", "text": "青い空" }]
  },
  "result": {
    "target": "ko",
    "lines": [
      {
        "id": "line-0",
        "segments": [
          {
            "source": "青い空",
            "language": "ja",
            "reading": "アオイソラ",
            "pronunciation": "아오이 소라",
            "needsReview": false
          }
        ]
      }
    ]
  }
}
```

This example is synthetic; it is not a measured model response.
`result` is the app-facing pronunciation object, not a raw OpenAI response or a saved-library entry.
Do not include API credentials, HTTP headers, or an outer usage wrapper.

```sh
node tools/pronunciation-quality/evaluate.mjs /absolute/path/to/capture.json --response
```

The tool reuses the server validators, requiring exact line IDs, original source reconstruction, supported fields, and valid review handling.
It retains the server bounds of 12 lines, 40 segments per line, and 3,000 total source characters, plus the CLI's 1 MiB input limit.
Unlike the synthetic fixture mode, it accepts up to 480 segments and does not accept `--check`.
Exit 0 means a report was produced, not that the model passed a quality gate.

Each result carries `lineId`, zero-based `segmentIndex`, final `pronunciation`, and the model's original `needsReview` flag; its stable ID combines line ID and segment index.
The report includes `inputKind: "response"`, `target`, and `modelReviewRequired`, the number of flagged segments.
A dictionary match never clears that flag or validates final target-script pronunciation.
Whitespace-only segments are retained as `unassessable` with reason `non_lexical_source`.
The tool does not infer or merge language boundaries and does not fill missing readings.
Captures and reports contain supplied text; keep real samples outside Git unless explicitly approved for publication.
No API requests are made, and no app storage is modified.

## Report

The CLI emits JSON to stdout, with engine and Node versions, one dictionary-load duration, per-phrase timings, source-preserving token evidence, reference candidates, and comparison outcomes.
Each timing is a single local measurement, not a stable performance guarantee.

| Outcome                | Meaning                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| `reference_match`      | Normalized model reading matches either the dictionary lexical reading or pronunciation candidate. |
| `reference_difference` | Comparable readings differ; inspect both rather than automatically replacing one.                  |
| `unassessable`         | Unsupported language/script, missing reading, unknown token, or incomplete dictionary evidence.    |

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
