# Song search implementation plan

The operator approved artist - title search, automatic top-video selection, and a subsequent LRCLIB search while retaining direct links.
The configured local API key successfully returned a Vaundy video through the official API without exposing the key in output.
Project Oracle retrieval returned `[no precedent found]`.

1. Add failing shipped-page tests for song search, official request parameters, readiness handoff, recoverable failures, and stale-request invalidation.
2. Read YOUTUBE_API_KEY from ignored local.properties through a generated common Kotlin source under shared/build; missing keys disable search without breaking direct links or CI.
3. Add a bounded search module to the existing shared HTML, reuse the existing player lifecycle, and expose the existing lyric search as a callable function with generation protection.
4. Run JavaScript and JVM behavior tests, scoped Trunk, and Android/iOS builds sequentially.
5. Inspect rendered search/metadata/lyric handoff, probe the live API without printing credentials, and install the iOS build for native verification.
6. Review the request/credential boundary and asynchronous handoff independently if the final diff reaches the project's review threshold.

Owned paths: shared/build.gradle.kts, shared YouTube HTML modules, the shared YouTube HTML test, tools/test-youtube.mjs, README, AGENTS.md, and this feature's spec/verification documents.
Preserve the existing autocorrection and fixed-height lyric corrections, plus the two unrelated research documents.
The key remains outside Git but is included in locally configured app builds; this is a client API key, not a confidential service-account credential.
Do not add cloud deployment, account switching, or service-account authentication.

## Follow-up implementation

1. Extend controlled shipped-script tests for duration ranking, delayed metadata, timing buttons, screen navigation, and repeat controls.
2. Keep the implementation in the shared HTML modules; reuse the player and request lifecycle without new dependencies.
3. Verify actual browser search results, keyboard-free timing adjustment, navigation pause, and repeat enabled/disabled at the end of a real video.
4. Rebuild sequentially and install the updated iOS host for operator validation of the revised screens.

## Compact practice follow-up

1. Add failing tests for panel pause/close behavior and reading-area scroll reset.
2. Replace the practice page flow with a bounded responsive grid and move secondary tasks to a modal panel.
3. Compare old/new rendered layouts, inspect small/landscape/enlarged-text states, and exercise the panel with real browser controls.
4. Run the shared behavior checks, Android checks, and final iOS build sequentially; install the result for operator verification.
