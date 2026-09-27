# Visible YouTube player spike

## Contract

Add a separate YouTube screen reachable from the local practice screen.
Users enter a YouTube video URL or an 11-character video ID, then start playback with the official visible player controls.
Show actual playback time, allow five-second seeks, and explain embedding or network failures.
Pause local playback and turn off local line repeat on entry; pause embedded playback on background, loss of player visibility, and dismissal.
Returning does not automatically resume either source.
Preserve the imported song and its manifest.

## Boundaries

This is a playback feasibility slice, not synchronized lyric integration.
No API keys, Data API search, audio extraction, downloads, background playback, lyric retrieval, automatic pronunciation, repeat timing guarantees, or additional libraries.
Do not adapt remote seeking to the current local AudioPlayer contract until latency has been measured.

## Architecture and identity

Share the page and player logic through a Kotlin HTML function exported to both hosts.
Use Android WebView and iOS WKWebView with an HTTPS base URL derived from the installed application ID.
Validate the ID before inserting the origin into HTML.
Restrict entered video identifiers to the expected alphabet and length; never insert user URLs into HTML or JavaScript.
Retain YouTube branding, controls, and advertisements; keep the player at least 200 CSS pixels in each dimension.
Use the documented [`fs=0` parameter](https://developers.google.com/youtube/player_parameters#fs) to omit the fullscreen button because this slice supports inline playback only.
Pause when less than half the player is visible.
Only HTTPS top-level user navigation may leave the page through the system browser.

Sources checked 2026-09-27: [minimum functionality](https://developers.google.com/youtube/terms/required-minimum-functionality), [IFrame API](https://developers.google.com/youtube/iframe_api_reference).
These documents specify embedding behavior, not permission to distribute lyrics.

## Acceptance

- Shared-page tests execute the shipped JavaScript with a controlled player and cover accepted/rejected inputs, error states, seeks, and lifecycle pauses.
- Existing shared tests, Android build/Lint, iOS host build, and scoped Trunk checks pass.
- Native smoke checks distinguish real network playback from simulated player behavior; blocked playback is reported without inventing a latency measurement.
- Device files, local song restoration, and existing practice behavior remain unchanged.
