# Saved practice implementation plan

## Ownership

Modify `YouTubeLyrics.kt`, `YouTubeEmbed.kt`, `tools/test-youtube.mjs`, and `README.md` for the requested behavior and current contract.
Add `YouTubeLibrary.kt` for the small storage and saved-list feature.
Add this spec, plan, and a verification note under the existing docs directories.
Preserve unrelated research notes and the approved scrolling implementation.

## Steps

1. Add failing behavior tests for script labels and cross-instance reference persistence, including failures and cancellation.
2. Implement bounded script analysis, safe text previews, versioned reference storage, and exact-ID restoration.
3. Run the page tests and review lifecycle/storage edge cases.
4. Inspect rendered candidate and saved-list UI with an isolated named browser session, including actual reload.
5. Run scoped formatting checks and sequential mobile builds; install over the existing DeviceHub build for operator review.

## Authority and evidence

The user requested implementation of script information and saved video/lyric/offset settings.
This turn retains implementation and verification scope; publication remains a later PR stage.
Oracle personal project retrieval returned `[no precedent found]` for lyric persistence and script detection.
