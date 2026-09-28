# Compact practice layout verification

## Approved direction and scope

The operator approved implementing the review proposal: keep the visible video, active lyrics, and primary controls together without long page scrolling.
Changes are limited to the shared HTML modules, shipped-script tests, and related documentation.
The Flutter-specific review skill was used only to establish the earlier review boundary; this implementation is KMP/WebView work explicitly authorized afterward.
No dependency, backend, native navigation API, or credential contract changed.

The preceding personal project Oracle retrieval for practice layout and compact controls returned `[no precedent found]`.
Its narrowed results were partially truncated, so that result does not establish that no applicable precedent exists.
No unrelated precedent was applied.

## Implementation and behavior

A viewport-sized grid contains a compact toolbar, the official player, playback metadata, a flexible lyric reading area, and bottom controls.
Lyrics may scroll inside the reading area without moving the transport and timing controls.
Long titles are truncated in the toolbar; full video and lyric metadata remain available in the settings panel.
The LRCLIB attribution link remains visible on the main practice screen.

Lyric search, result selection, metadata, and precise numeric timing entry are in a scrollable native HTML dialog.
Opening it pauses playback and makes the playback guard reject playback while the player is obscured.
Selection closes the dialog; close and Escape return focus without autoplay.
Player errors remain visible above the video; routine playback status stays available to assistive technology without occupying a paragraph.
Short landscape viewports use side-by-side video and lyric/control columns.

## Controlled checks

`node --test tools/test-youtube.mjs` passed 45 tests.
New panel tests and the shared reading-area scroll-reset test failed before implementation and passed afterward.
The fixture models dialog open/close state and player pause calls; it does not verify browser geometry or native rendering.
The existing delayed search, duration ranking, repeat, recovery, and lifecycle tests remain passing.

## Rendered checks

A named agent-browser session loaded the shipped templates with a clearly labeled fake player and synthetic original lyrics for layout checks.
The old-layout negative control failed the geometry assertion because the current lyric and timing controls were below the viewport.
The compact layout passed the same check.

| Browser viewport | Document height | Reading area height | Bottom of controls | Result |
| --- | --- | --- | --- | --- |
| 393 × 700 | 700 | 212 | 688 | No outer overflow |
| 320 × 568 | 568 | 90 | 556 | Controls remain visible |
| 852 × 393 | 393 | 163 | 381 | Side-by-side layout fits |
| 393 × 700, 32px root/body text | 700 | 100 | 688 | Enlarged text and controls fit |

The enlarged-text fixture is a browser CSS scaling check, not a native Dynamic Type claim.
At 320 × 568, a long lyric produced 2307 pixels of internal content in a 90-pixel reading area; scrollTop reached 120 while the controls stayed at 556.
A populated results panel had 1818 pixels of content within a 674-pixel panel, while the document remained 700 pixels tall.
Escape closed the panel and returned focus to lyrics-panel-open.
A player-error fixture displayed a 40-pixel error message without pushing controls outside the viewport.

## Live provider check and repair

A separate browser session loaded the real YouTube iframe and live LRCLIB results with the configured local key.
The actual long video title exposed a horizontal grid overflow that the short-title fixture did not produce.
A geometry assertion failed with the panel button outside the viewport; explicit minmax(0, 1fr) columns and minimum-width constraints fixed it.
The final stylesheet was loaded directly from the edited source into the running page for the repair check.
With the real title, the same assertion passed at 393 × 700, 320 × 568, and 852 × 393, with document widths matching the viewport widths.

The actual player reached playing state 1.
Opening the lyrics panel changed it to paused state 2 and canPlay=false.
Selecting LRCLIB record 28750912 closed the panel while retaining paused state 2 and displayed timed lyrics.
The final real-provider screenshot is `build/qa/compact/live-selected.png`.
Other ignored captures include portrait.png, small.png, landscape.png, large-text.png, and panel.png in that directory.
The browser sessions and local server were closed, and the QA page's configured key was replaced with a fixture value.
No credential was printed.

## Build checks

The final `./gradlew --no-daemon :shared:jvmTest :androidApp:assembleDebug :androidApp:lintDebug -Pkotlin.incremental=false` run passed.
The JVM report contains 26 tests with zero failures or errors.
The final unsigned iOS host build passed after the long-title CSS repair.
Scoped Trunk and `git diff --check` passed.
The implementation was reviewed for modal playback guards, focus return, plain/timed lyric states, stale request behavior, provider-text boundaries, and viewport constraints.
The live-data overflow finding was repaired before the final build.

## Limits

The checks above establish browser rendering and exercised browser interactions.
Native iOS keyboard insets, VoiceOver, Android TalkBack, and device-specific text scaling were not exercised in this pass.
The operator approved the installed iOS layout on 2026-09-28 and requested publication of the PR.
The supplied 10:46:35 AM iPhone 17 Pro screenshot shows real video playback, active lyrics, enabled single-song repeat, a 5.5-second timing adjustment, and all primary controls in the visible screen.
This confirms the reviewed native visual result; it does not expand the accessibility or keyboard checks listed above.
