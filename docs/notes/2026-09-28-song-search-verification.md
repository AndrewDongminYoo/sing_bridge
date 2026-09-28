# Song search verification

## Scope and precedent

Added artist - title YouTube search while keeping direct links and manual LRCLIB search.
Player readiness triggers one LRCLIB search with the original terms; users still select the lyric record.
The same change retains automatic-correction disabling and fixed-height timed lyric regions.
Project-scoped personal Oracle retrieval returned `[no precedent found]`; no unrelated precedent changed this implementation.

## Behavior and reviews

`node --test tools/test-youtube.mjs` passed 33 tests against the shipped scripts with controlled DOM, player, clock, and network responses.
The checks cover official search parameters, missing credentials, invalid inputs, empty and malformed results, size limits, timeout, quota retry delay, stale responses, direct-link cancellation, and one readiness handoff.
The pending-lyric-request regression failed before repair because a repeated submission replaced the promise needed for the next handoff.
The unavailable-video regression failed before repair because the searched candidate replaced the prior player without recovery.
A searched candidate now restores the prior usable video and selected lyrics if it errors or times out before playback starts.
Restoration preserves the timing adjustment, cues the prior position at integer-second precision, and keeps autoplay disabled.
Controlled tests also cover late candidate callbacks and prevent rollback after playback has started.
These checks do not establish native WebView behavior or provider availability.

Independent security review found no blocking issue.
Independent lifecycle review found the missing player-error recovery; a targeted re-review approved the repair.
Scoped Trunk checks and `git diff --check` passed.
No dependency version changed; the Gradle dependency lockfiles remained unchanged.

## Live browser evidence

An official YouTube Data API request using the locally configured key returned HTTP 200 for Vaundy 踊り子.
A local browser page built from the shipped templates then used real YouTube and LRCLIB requests, without fake network or player responses.
Only the app origin was changed to the local test origin.
The browser verified cross-origin access with the API-key header, selected video `7HgJIAUtICU`, displayed its Vaundy channel metadata, and populated 20 bounded LRCLIB candidates using the original query.
Clicking the official player produced state 1 and an advancing position of 37.835882 seconds for a 246-second video.
Choosing LRCLIB record 28750912 displayed timed lyrics and collapsed the search results.
At a 393 by 852 viewport, the current lyric region measured 101 pixels and the context region 48 pixels, with no horizontal page overflow.
A prior short/long/empty fixture check measured the same total lyric region height of 387.578125 pixels and confirmed internal scrolling for long text.
The search input reported autocorrect=off.

Ignored screenshots: `build/qa/song-search/live-search.png` and `build/qa/song-search/selected-lyrics.png`.
Both browser sessions and the local HTTP server were closed after checks.
The real key was replaced with a fixture key in the local QA page after use; no credential was printed.
A publication-material check rejected a deliberately supplied secret fixture, then passed the scoped diff and new source documents.

## Native builds and operator verification

`./gradlew --no-daemon :shared:jvmTest :androidApp:assembleDebug :androidApp:lintDebug -Pkotlin.incremental=false` passed after the final source changes.
The JVM report contains 26 tests with zero failures, errors, or skips.
The unsigned iOS host build passed with the configured key and final recovery code.
The build was installed over the existing SingBridge app on DeviceHub iPhone 17 Pro `89E4D493-3048-486A-BCC0-3F3D749B3929`.
Launch returned PID 49902, and a subsequent process check found the app running.
A later screenshot showed the home screen, so install and process launch are the only native runtime claims from this pass.
No physical phone was used.

After installation, the operator confirmed that search, playback, and lyric selection work in the iOS app.
This confirmation completes the new search flow runtime check independently of browser evidence.
Direct-link replacement and background return were not included in this latest confirmation; existing controlled coverage and earlier operator checks remain separate evidence.

Because AGENTS.md was updated, `codex doctor --summary --ascii --no-color` was run as an advisory diagnostic.
It reported 1 warning, 0 failures, and 3 notes; the warning concerns local update configuration.
No Codex configuration was changed.
