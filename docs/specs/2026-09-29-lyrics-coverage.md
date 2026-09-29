# LRCLIB coverage check

Issue: #19.

## Intent

Measure the lyric-availability target of Gate A in the [competitive brief](../notes/2026-09-29-competitive-brief.md) with the same search the app performs, so a coverage number describes what a user would actually be offered.

## Scope

Add a dependency-free Node tool under `tools/lyrics-coverage/` that reads a curated song list and reports, per song, whether synced lyrics are offered near the expected duration.
The tool's behavior and statuses are documented in [its README](../../tools/lyrics-coverage/README.md).
Tests use fixture responses and run in CI; they make no network requests.

## Constraints

- Store and print metadata only; lyric text never leaves the process.
- Follow LRCLIB's guidance: client identification, sequential requests with a delay, and no further requests after HTTP 429.
- Keep the query, response limit, candidate normalization, and 20-candidate display limit aligned with `YouTubeLyrics.kt` and `YouTubeSearch.kt`.

## Non-goals

- Choosing the curated 30-song list: the operator approves it.
- Judging false matches automatically: a person confirms the top candidate.
- Running the app's LRC parser or changing app behavior.

## Acceptance

- The Node tests pass locally and in CI.
- A dated verification note records a live run; the Gate A run itself waits for the approved list.
