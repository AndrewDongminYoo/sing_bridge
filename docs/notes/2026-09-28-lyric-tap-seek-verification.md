# Lyric tap playback verification

## Scope

The [approved plan](../plans/2026-09-28-lyric-tap-seek.md) adds playback from a timed lyric without changing source lyrics, pronunciation edits, saved practices, or the timing adjustment.
Original text and pronunciation share one native button action.
The player must be ready, visible, and in the foreground with the settings dialog closed.
Personal project Oracle returned `[no precedent found]` for lyric seeking and pronunciation quality.

## Behavioral checks

The regression tests execute JavaScript extracted from the shipped Kotlin HTML fragments with a controlled player.
Before implementation, the five new tests produced four expected failures and one pass: rows were not buttons and activation did not seek.
The green command was `node --test tools/test-youtube.mjs server/pronunciation.test.mjs`: 94 tests passed.
Coverage includes positive and negative offsets, zero clamping, end rejection, unavailable playback, dragging, scroll movement, cancellation, blank markers, detached rows, preserved pronunciation rendering, and delayed player position updates.
`JAVA_HOME='/Applications/Android Studio.app/Contents/jbr/Contents/Home' ./gradlew :shared:jvmTest` passed and verifies shared Kotlin behavior and compilation.

Scoped `trunk check --no-fix` checked six Kotlin and Markdown files and reported no issues.

## Rendered browser checks

An isolated `agent-browser` session named `singbridge-lyric-tap` loaded the actual shipped HTML with a synthetic YouTube player and synthetic LRCLIB content.
The fixture used 16 original practice lines and a 100-second duration, without commercial lyrics or live provider requests.
An assertion using the deliberately wrong target of 999 seconds failed before the correct target was accepted.
The following checks passed in Chromium:

- Clicking the line at five seconds issued seek to five seconds and then play.
- Enter and Space on that focused button each issued the same action.
- Dragging across the button issued no seek; the next deliberate click worked.
- Wheel scrolling issued no seek.
- Adding a 5.5-second delay made the five-second line seek to 10.5 seconds.
- Clicking a synthetic pronunciation child used its parent line's eight-second timestamp.
- Portrait and landscape captures retained the existing fixed player, lyric viewport, and footer layout.

Local, ignored evidence is under `build/qa/`: `lyric-tap-fixture.html`, `lyric-tap-portrait.png`, `lyric-tap-landscape.png`, `lyric-tap-pronunciation.png`, and `lyric-tap-demo.webm`.
The recording demonstrates the rendered interaction with a controlled player; it is not evidence of real video seeking or AI pronunciation quality.
The browser session and fixture server were stopped after verification.

## Remaining limits

Actual iOS 27.0 WebView touch input, YouTube network seek latency, and native accessibility activation remain unverified in this change.
The operator previously deferred native interaction testing while the remote Mac was locked; that does not establish a general Device Hub input failure.
Before merging, inspect the rendered result and test tapping versus swiping in the native app when the device is available.
