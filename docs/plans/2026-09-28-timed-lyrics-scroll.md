# Timed lyric scrolling implementation

1. Replace obsolete three-label fixture checks with stable-list and auto-follow regressions; observe intended failures.
2. Update YouTubeLyrics.kt to create rows only on lyric selection, highlight timestamp boundaries, and control follow suspension locally.
3. Update only lyric styles in YouTubeEmbed.kt; retain the player and controls grid.
4. Run `node --test tools/test-youtube.mjs`, scoped Trunk, and shared JVM checks.
5. Verify rendered motion and manual reading using a named browser session, capture a recording, and build/install the iOS host sequentially when machine capacity permits.
6. Record limits and request operator motion review before a subsequent PR merge.

Owned scope: shared YouTube lyric module, lyric CSS in the embed module, shipped-script tests, this spec/plan, and a verification note.
Preserve unrelated research notes and all credentials.
No dependency or public API changes are required.
