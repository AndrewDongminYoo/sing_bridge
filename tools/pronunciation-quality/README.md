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

## Measure the reviewer edit rate

`edit-rate.mjs` reads the app's saved library and counts, per saved song and target language, how many generated pronunciation lines a reviewer edited.
It supports the pronunciation-accuracy target in Gate A of the [competitive brief](../../docs/notes/2026-09-29-competitive-brief.md).

Protocol for a measurement:

1. On the iOS Debug simulator, generate pronunciation for a song, have a fluent reviewer read every line and correct it with **음차 수정**, then save with **음차 저장**. Note the LRCLIB ID and target of each reviewed song.
2. Extract the saved library into a fresh directory from a copy of the simulator's WebKit storage, and confirm the extraction wrote a file:

   ```sh
   rm -rf build/edit-rate && mkdir -p build/edit-rate
   container=$(xcrun simctl get_app_container booted io.github.andrewdongminyoo.singbridge data)
   store=$(find "$container/Library/WebKit" -name localstorage.sqlite3 | head -1)
   cp "$store"* build/edit-rate/
   sqlite3 build/edit-rate/localstorage.sqlite3 "select writefile('build/edit-rate/library.bin', value) from ItemTable where key='singbridge.practice.v1';"
   test -s build/edit-rate/library.bin
   ```

3. Run the report, naming each reviewed layer as `<lyricId>:<target>`, or `<videoId>:<lyricId>:<target>` when the same lyrics are saved for more than one video:

   ```sh
   node tools/pronunciation-quality/edit-rate.mjs build/edit-rate/library.bin --reviewed 35923881:ko
   ```

The input can be UTF-8 or the UTF-16LE value WebKit stores, up to 4 MiB.
The tool validates the fields the report reads: the version-1 envelope; each entry's video ID, LRCLIB ID, and title type; each layer's target and source lines; generated lines, with the server's `validateResult` as the app uses; and edits, with the app's edit limits.
It does not validate fields that do not affect the counts, such as the timing offset, the preferred target, or the app's 20-entry limit, so it is not a full check of what the app would load.
Invalid input, or a `--reviewed` key that matches no layer or more than one, exits 2 without echoing input.
`layers` lists every saved layer with video ID, LRCLIB ID, saved title, target, lines with text, generated and missing lines, whether generation completed, edited and unedited lines, lines with a review flag, and the unedited ratio.
`total` covers only the `--reviewed` layers and is `null` without them, so unreviewed or stale layers never enter the measurement; it counts songs and layers separately.
The unedited ratio divides unedited generated lines by lines with text, so lines that were never generated count against it.
An edit identical to the generated text does not count as a change, and the report never prints lyric or pronunciation text.

The app does not record that a review happened, so naming a layer with `--reviewed` is the operator's statement that a reviewer finished it.
Since #29, the server marks a segment for review when its language is unknown or its pronunciation is empty, so a review flag no longer shows whether the model or the server set it.
Keep extracted libraries under the ignored `build/` directory, and delete them after measuring; they contain lyrics.

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
