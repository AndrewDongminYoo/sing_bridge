# Lyric sync disclosure verification

## Rendered regression

The ignored fixture was assembled from the shipped Kotlin HTML strings, omitting only the external YouTube loader and using authored demonstration lyrics with a controlled player.
Before the change, the real browser check failed with `Sync actions must be collapsed by default` because the earlier button was visible.
After the change, the same check passed.
The named `singbridge-sync` browser session exercised clicks and Enter on the native summary, rather than setting its open state directly.

At a controlled position of 10 seconds, expanding, adjusting by +0.5 seconds, collapsing, and reopening retained the offset and position.
Play, pause, and seek counters remained zero throughout those actions.
Keyboard Enter reopened the controls successfully.
The collapsed timing summary remains visible.

At 390 × 680, the expanded page measured 390 × 680 with a 118-pixel lyric viewport, a 204-pixel video viewport, and controls ending at y=668.
At 844 × 390, the expanded lyric viewport was 80 pixels high and the controls ended at y=378.
There was no horizontal page overflow at either size.
Screenshots were inspected at `build/qa/sync-collapsed.png`, `build/qa/sync-expanded.png`, and `build/qa/sync-landscape.png`.
The named browser session and local fixture server were closed after verification.

## Automated checks and review

The final shipped-script and server suite passed 95 tests, including offset-only adjustment, clamping, reset, plain-lyric restrictions, and storage behavior.
Shared JVM tests passed.
Scoped Trunk checks and `git diff --check` passed.
No new mirrored markup unit test was added; the observable disclosure regression was checked in the rendered DOM.

A single inline review covered the small markup/CSS change, native details keyboard semantics, existing button IDs/listeners, offset state ownership, viewport bounds, and unchanged modal pause behavior.
No blocking finding was identified.
No native adapter, timing calculation, storage format, or dependency changed.
Oracle returned `[no precedent found]` for sync controls and lyric calibration.

## Limits

The browser fixture verifies layout and commands sent by the app, not real YouTube media playback or native WebView integration.
No new simulator build was installed in this pass; the device retains the merged navigation build.
Hosted native build results belong to the PR checks.
Operator visual approval is pending for this change.

## Hosted review repairs

The 320 × 568 portrait regression reproduced a 10-pixel lyric viewport before the compact-layout repair, failing the 80-pixel minimum check.
After repair, the expanded lyric area measured 86 pixels and the footer ended at y=556 within the 568-pixel viewport.
On short portrait screens, opening calibration hides transport buttons and explanatory copy; closing it restores transport without changing the offset.
Real browser clicks verified +0.5 seconds with unchanged position 10 and zero play/pause/seek commands.
Evidence: `build/qa/sync-small-expanded.png` and `build/qa/sync-small-collapsed.png`.

A new shipped-script regression failed with `true !== false` because replacing a video left the disclosure open.
It now passes after resetting details.open in resetLyrics; invalid links retain the current disclosure state.
The repair was reviewed inline for DOM availability, reset call sites, media-query scope, and unchanged adjustment handlers.
