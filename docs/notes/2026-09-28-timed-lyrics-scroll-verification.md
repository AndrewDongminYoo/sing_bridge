# Timed lyric scrolling verification

## Scope and implementation

The operator requested playback-synchronized scrolling after approving the compact practice screen.
The native host remains SwiftUI plus WKWebView, with lyric presentation in the shared Kotlin HTML templates.
The supplied SwiftUI patterns references informed stable row identity, narrow local state, and anchored scrolling rather than a framework migration.
Project Oracle retrieval returned `[no precedent found]`.

Timed rows are created when lyrics are selected and retain their identity while the current timestamp changes.
The active row gains emphasis without changing font size or weight; only the lyric reading area scrolls.
Player position is polled every 250 milliseconds and remains the timing source.
Pointer, wheel, and keyboard interactions suspend following for four seconds, with held pointers continuing to suspend it.
Reduced motion uses immediate alignment.
Oversized active rows align at their beginning, and viewport resize schedules realignment.
No scrolling action seeks audio.

## Controlled behavior checks

`node --test tools/test-youtube.mjs` passed 53 tests.
The prior three-label assertions were replaced with a current-row lookup in the stable-list fixture.
The first new list test failed before implementation because the timed container had no rows; hidden-screen tracking also failed its expected scroll assertion.
The tests verify row identity, boundary-only scroll requests, pause/resume after manual reading, reduced motion, backwards playback movement, and hidden/dialog guards.
Existing search, cancellation, restoration, offset, and background tests remain passing.
Fixture geometry is synthetic and does not establish browser rendering.

## Rendered motion checks

A named agent-browser session loaded shipped templates with a clearly labeled fake player and original synthetic lyrics.
A negative control removed the active-row marker and produced the expected Missing active timed lyric failure before the geometry check was trusted.
At 393 by 700, advancing playback from zero to 20 seconds moved scrollTop from 30 through an observed intermediate 195 to 332, with the active row centered and the document height still 700.
At 320 by 568 the reading area was 90 pixels high and controls ended at 556.
At 852 by 393 the reading area was 163 pixels high and controls ended at 381.
Both layouts retained current-row alignment and no horizontal overflow.

A trusted PageUp input held the reading position at 449 while the playback row changed, then resumed following to 211 after the interaction delay.
The CLI scroll and wheel attempts did not emit the expected wheel event, so they are not evidence of real wheel behavior; wheel and pointer suspension are covered by the controlled tests only.
With browser reduced-motion emulation, scrollTop changed immediately to 90 and remained 90 after 60 milliseconds.
A 1258.84-pixel row in a 212-pixel reading area aligned its beginning with a zero-pixel top difference.

The motion recording is `build/qa/scroll/timed-lyrics-final.webm` and shows five timestamp transitions.
The earlier timed-lyrics.webm capture was aborted after recording initialization reset the fixture; it is not the deliverable.
Static captures are portrait.png, small.png, and landscape.png in the same ignored directory.
The browser and local HTTP server were closed after verification.
No API key or commercial lyric text was used in these artifacts.

## Native and quality checks

Shared JVM tests passed: 26 tests, zero failures, errors, or skips.
Android assembly and lint passed.
The unsigned iOS host build passed and was installed over the existing DeviceHub iPhone 17 Pro app.
Scoped Trunk and `git diff --check` passed.
Local review checked stable row identity, unchanged provider-text rendering, bounds, scroll-only effects, manual follow state, and existing recovery contracts.

The motion checks establish browser behavior with controlled playback, not real YouTube scheduling, native touch gestures, VoiceOver, TalkBack, or Dynamic Type.
The operator subsequently approved the native scrolling screen: “화면 승인합니다.”
