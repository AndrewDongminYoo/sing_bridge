# LRCLIB coverage check

Measures how many songs in a curated list have synced LRCLIB lyrics that the YouTube practice screen could offer.
It supports the lyric-availability target in [the competitive brief](../../docs/notes/2026-09-29-competitive-brief.md) and decision gate 3 of [the product research](../../docs/notes/2026-09-27-product-risks.md).

## Run

Requires Node 22 or later and internet access.

```sh
node tools/lyrics-coverage/coverage.mjs songs.json --out build/lyrics-coverage.json
```

`--delay-ms` sets the pause between songs (default 1000).
Without `--out`, the report is printed to standard output.
Invalid input exits with status 2 before any request is sent.

The song list is a JSON array of up to 100 entries:

```json
[{ "artist": "Vaundy", "title": "踊り子", "durationSeconds": 246 }]
```

`durationSeconds` is the length of the recording a user would play; use `null` when it is unknown.
The artist and title must fit the app's 120-character `가수 - 제목` limit.

## What it measures

Each song is searched the way the app searches after a YouTube match: one `GET /api/search?q=<artist> <title>` request with the app's `Lrclib-Client` header, and a 4 MiB response limit.
The first HTTP 429 ends the run without retrying: that song and every later one are recorded as errors, and no further request is sent; rerun later.
Songs are requested one at a time.
Candidates are ranked by duration difference and limited to the 20 the app displays.

| Status                  | Meaning                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `synced`                | A displayed candidate has synced lyrics within 2 seconds of `durationSeconds` (any synced candidate when the duration is unknown) |
| `synced-other-duration` | Synced lyrics exist only for other durations, which may be a different recording                                                  |
| `plain-only`            | Only unsynchronized lyrics are displayed                                                                                          |
| `none`                  | No displayed candidate has usable lyrics                                                                                          |
| `error`                 | The request failed; the song is excluded from `syncedRatio`                                                                       |

The report lists up to five candidates per song with ID, names, duration, and lyric type.
It never contains lyric text.

## Limits

A `synced` status does not prove the lyrics match the recording: a person still has to confirm the top candidate, and false matches should be recorded separately from missing lyrics.
Without `durationSeconds`, the first synced record in provider order counts as the match; in the first live run that was a record titled as an instrumental version, so give a duration for every song in a gate run.
The check does not run the app's LRC parser, so a synced record that the app rejects (for example word-level timestamps) still counts as synced.
Search results and provider records change over time; a report describes one run.
