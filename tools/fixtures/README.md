# Practice fixtures

## Odoriko

`odoriko-practice.json` records the operator-requested practice setup: search for `Vaundy - Odoriko`, choose the selected lyric record, and delay lyrics by 5.5 seconds.
It contains public video and lyric identifiers, a display title, and an offset; it contains no lyric body, audio, generated pronunciation, or credentials.

The recorded video is `7HgJIAUtICU` and the lyric record is LRCLIB `35923881`.
The `selection` text describes the original search session; search ranking and provider metadata can change, so use the recorded IDs when reproducing that session.
`videoDurationSeconds` is a recorded observation, not an assertion about current provider data.

The `practice` value uses the app's version 1 saved-library format, and `storageKey` names its storage entry.
The outer object is fixture metadata, not an app import format.
The app does not seed this fixture automatically.
Use the normal UI to select and save this setup, or load only `practice` into an isolated QA storage harness.
Do not replace an existing user's saved-library entry with this fixture.

Reopening the practice requires the current external providers and may fail if the video or lyric record is unavailable.
This fixture is useful for manual reproduction; it is not a deterministic CI test or a pronunciation-quality benchmark.
