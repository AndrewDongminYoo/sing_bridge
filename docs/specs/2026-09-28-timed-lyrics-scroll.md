# Timed lyric scrolling

## Approved direction

The operator requested Apple Music-like lyric scrolling synchronized with playback after approving the compact practice layout.
Keep the KMP shared WebView and visible official YouTube player; do not migrate this surface to SwiftUI.
The supplied SwiftUI patterns guide informs stable row identity, local state ownership, and anchored scrolling.
Personal project Oracle retrieval returned `[no precedent found]`.

## Behavior

Render timed lyrics as one stable chronological list inside the existing reading area.
Highlight the current timestamp group and smoothly center its row when playback crosses a boundary.
Keep line height stable when emphasis changes.
Position an oversized row at its beginning so users can read it with internal scrolling.
Before the first lyric and after playback ends, no row is active.
Seeking, repeating, and offset adjustment use the actual player position and existing timestamp calculation.
Never seek audio as a side effect of reading or scrolling lyrics.

Manual touch, wheel, or keyboard scrolling suspends following until four seconds after the last interaction; a held pointer continues to suspend it.
Resume following the current row even if playback has not crossed another boundary.
Respect prefers-reduced-motion, avoid repeated scroll calls for an unchanged row, and realign after viewport resizing.
Do not scroll hidden practice content or an obscured player panel.
Plain lyrics remain readable without timed tracking.
Preserve safe text rendering, bounded requests, replacement recovery, video visibility, and fixed controls.

## Acceptance

1. Shipped-script tests fail before the change for stable list identity, boundary scrolling, manual suspension/resume, seek/loop changes, and reduced motion; existing search/recovery tests remain passing.
2. Rendered browser checks observe intermediate scroll positions and final row alignment using synthetic original lyrics, including small and landscape viewports, a long row, and reduced motion.
3. Provide a motion recording rather than screenshots alone, and build the native iOS host for operator verification.
