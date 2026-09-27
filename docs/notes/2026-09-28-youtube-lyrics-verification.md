# YouTube lyrics verification

## Scope

LRCLIB search and explicit selection in the shared visible YouTube page, with line synchronization, signed timing adjustment, and plain-lyrics fallback.
No automatic pronunciation, native bridge, dependency, backend, persistent lyric cache, or provider publishing was added.

## Automated behavior

`node --test tools/test-youtube.mjs` executes the scripts extracted from the shipped Kotlin HTML in document order with controlled DOM, player, and network boundaries.
All 20 tests passed.
The missing-search implementation first failed the outgoing request assertion with `0 !== 1`.
A later regression test for unread 429/503 bodies first failed `false !== true`; the request now aborts in `finally`, after the original error message is set.
Coverage includes candidate selection, text-only provider rendering, real player-position reads, timing boundaries, signed offsets, plain lyrics, video replacement, stale requests, request serialization, timeout, rate limiting, and response-size bounds.
These tests do not establish real native playback or network behavior.

Shared JVM XML reports contain 25 tests across four suites with zero failures.
The final Gradle check passed shared JVM tests, Android debug assembly, and Android Lint with `--no-daemon -Pkotlin.incremental=false`.
The unsigned iOS host build passed again after the final request-cancellation and wrapping repairs.
Scoped Trunk checks passed Kotlin and Markdown files.

## Rendered browser checks

Used an isolated `agent-browser` session with the shared HTML, a controlled player, and original fixture lyrics at a 393 by 852 viewport.
Searched, selected a record, and inspected the rendered current/next lines.
The player remained pinned at viewport top with a measured height of approximately 220 pixels while the lyric lines were visible.
A positive two-second adjustment cleared the current line at player time two seconds and displayed it at four seconds.
A 500-character unbroken lyric reproduced horizontal overflow: document width 6245 pixels at a 393-pixel viewport.
Applying the shipped `overflow-wrap: anywhere` rule reduced document width to 393 pixels and removed horizontal overflow.
Ignored screenshots are in `build/qa/lyrics/selected.png` and `build/qa/lyrics/timed.png`.
The browser session and task-owned local server were closed after inspection.

## Live provider probe

The official LRCLIB documentation permits the Lrclib-Client header; a preflight from the app origin returned that header in Access-Control-Allow-Headers.
A browser request from the local QA origin using the shipped search handler retrieved 20 candidates for Vaundy 踊り子.
Manual selection of record 35902952 successfully parsed 51 timestamp groups and enabled the offset control.
The browser used a controlled player, so this proves browser CORS, provider response handling, and parser compatibility for that record, not alignment to its recording or native WebView compatibility.
No provider lyric body was saved to the repository or verification screenshots.

## Review and limitations

Independent read-only reviews covered request/security boundaries and lyric timing/parser behavior.
The security review identified unread error-response bodies; the finalizer now aborts the request, and the new regression test passes.
The security reviewer rechecked the repair and approved with no remaining findings.
The behavior review found no blocking defect.
Local adversarial inspection additionally reproduced and repaired the long-text overflow above.

Actual LRCLIB search and synchronization against a playing video still need an Android/iOS native runtime pass.
The final debug build was installed over the existing app on the booted DeviceHub iPhone 17 Pro (89E4D493-3048-486A-BCC0-3F3D749B3929).
The app launch result is recorded in the task state.
No physical device was used.
The prior player-only operator approval does not establish approval of this new lyrics screen.
API availability and attribution do not establish commercial lyric rights.
Codex Doctor, run after project guidance changes, reported one warning, zero failures, and three notes; its warning concerns update configuration.
Project-scoped Oracle retrieval returned `[no precedent found]`.
