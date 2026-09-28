# Pronunciation persistence implementation

## Approved direction

Extend the existing saved-practice entry with optional language layers rather than introducing another database or service.
Keep original timed lyrics immutable and store user edits separately from generated segments.

## Steps

1. Add failing fresh-page persistence, quota failure, source mismatch, and malformed editing tests in `tools/test-youtube.mjs`.
2. Add bounded optional layers to `YouTubeLibrary.kt` and strict validation and editing controls to `YouTubePronunciation.kt`.
3. Restore matching layers after lyric selection in `YouTubeLyrics.kt` and style controls using existing tokens in `YouTubeEmbed.kt`.
4. Verify shipped script behavior with `node --test tools/test-youtube.mjs server/pronunciation.test.mjs`, JVM tests, and scoped Trunk checks.
5. Build and run the iOS 27.0 host, verify native persistence and input rejection, and present screenshots for visual review.
6. Review scoped behavior and storage boundaries before any authorized PR update.
