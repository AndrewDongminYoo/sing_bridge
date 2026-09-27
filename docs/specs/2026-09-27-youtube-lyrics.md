# YouTube lyrics selection and synchronization

## Contract

Connect the visible YouTube player to an explicit LRCLIB keyword search.
After loading a video, the user searches by song and artist, reviews title, artist, album, duration, and synchronization availability, and selects a record.
Never infer that the first result is the correct recording.
Show synchronized lyrics using actual player time, with a signed adjustment in seconds: a positive adjustment displays lyrics later.
Plain lyrics remain visibly unsynchronized.
Replacing the video clears its lyrics and adjustment; closing the screen discards search results and lyric text.

## Implementation boundary

Keep the official player visible while browsing lyrics.
Extend the existing shared WebView page with a bounded lyrics module; leave local Kotlin practice and import parsing unchanged.
The web parser handles line timestamps, repeated timestamps, same-time lines, metadata, and empty markers.
Reject enhanced word timestamps and nonzero embedded offset tags, matching the local import baseline; the explicit video adjustment supplies offset control.
Use text nodes for all provider content.
Use the browser's fetch implementation and the documented Lrclib-Client header, with sequential requests, a timeout, a response-size limit, and Retry-After handling.
Cancel requests on video replacement and ignore stale completions.
No new native bridge, dependency, backend, lyric publishing, persistent lyric cache, or automatic pronunciation.
API access and attribution do not establish commercial lyric rights; release clearance remains unresolved.

## Acceptance

1. Search and selection: tests execute the shipped JavaScript and check the outgoing request, explicit selection, empty results, malformed responses, request failure, timeout, rate limiting, and stale responses.
2. Timing: hand-authored fixtures check timestamp grouping, blank markers, line boundaries, positive/negative adjustment, seeks, and plain-lyrics behavior.
3. Existing behavior: run all shared JVM and JavaScript tests, Android build/Lint, and the unsigned iOS host build sequentially.
4. Rendered UI: inspect the player, search results, selected lyrics, and offset controls on a real rendered surface; distinguish fixture tests from live provider/native playback evidence.

## Sources

Checked 2026-09-27: [LRCLIB API documentation](https://lrclib.net/docs), its [served documentation bundle](https://lrclib.net/assets/index-cbb2e41f.js), and the [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference).
An OPTIONS probe with the app origin confirmed that the server permits the Lrclib-Client header across origins.
Personal-project Oracle retrieval returned `[no precedent found]` for YouTube lyrics and LRCLIB.
