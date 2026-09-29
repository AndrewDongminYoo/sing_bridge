# Lyric sync disclosure

## Contract

Separate playback seeking from lyric timing adjustments, following the operator's deferred request about confusing adjacent controls.
Keep five-second transport controls visible by default and collapse the lyric timing controls behind an explicit Korean summary.
Reset the disclosure when starting a new video, while an invalid link preserves the current practice.
In portrait viewports at most 599 pixels wide and 620 pixels high, expanded calibration temporarily replaces transport controls and omits the explanatory paragraph to preserve lyric space.
Collapsing restores the transport controls.
Opening or closing this inline disclosure must not pause, play, seek, clear an adjustment, or save anything.
Keep the current timing summary visible when collapsed.
Use native HTML details/summary so keyboard and accessibility behavior do not require a custom state machine.
Retain existing offset bounds, half-second steps, reset behavior, and plain-lyrics restrictions.
The modal settings panel still pauses playback; do not move calibration there because users need to hear the song while adjusting.

## Acceptance

Observe that the existing rendered page fails the default-collapse check, then verify the updated page in portrait and landscape.
Expand, adjust, collapse, and reopen using real browser interactions; verify the controlled player's position and play/pause counters are unchanged and the offset persists.
Existing shipped-script tests must still pass.
Keep the official player's viewport and remaining lyric area visible without page scrolling.
Browser fixtures establish rendered behavior and app commands, not real provider playback or native WebView integration.
Operator visual approval remains required before merge.
