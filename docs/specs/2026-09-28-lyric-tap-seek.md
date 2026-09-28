# Lyric tap playback

## Contract

Activating a nonempty timed lyric seeks to `max(0, lyric timestamp + signed offset)` and calls play within the user gesture.
Require a ready player, visible foreground practice screen, closed settings dialog, valid duration, and a target strictly before the video end.
Scrolling, dragging more than eight CSS pixels, pointer cancellation, and stale detached rows must not activate playback.
Blank timing markers and plain lyrics are not controls.
Use native button semantics so Enter, Space, accessibility activation, and clicks on pronunciation children follow the same action.
Do not modify original lyrics, pronunciation data, or timing adjustment.
Resume automatic following using the actual player position; YouTube seeking is asynchronous and may land near a keyframe.
Keep existing layout and controls, adding only row focus and pressed feedback.

## Verification

Shipped-script regressions cover signed offsets, invalid or unavailable playback, gestures, stale rows, and delayed player position updates.
A rendered browser fixture checks real DOM event propagation, keyboard activation, focus, drag suppression, and unchanged layout.
JVM tests and scoped Trunk checks validate the shared Kotlin host and source rules.
Native runtime verification remains separate from browser evidence and depends on device availability.

## Sources

The operator approved the linked plan in this conversation.
The official [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference#seekTo) describes `seekTo` and `playVideo`; this feature does not claim sample-accurate seeking.
Personal project Oracle returned `[no precedent found]`.
