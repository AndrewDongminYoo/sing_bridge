# Text selection on the YouTube page

Andrew asked on 2026-09-30 that tapping app UI no longer select text, while lyrics may stay selectable.

## Where selection happened

The Compose screens (Home and My Songs) use plain `Text` without a `SelectionContainer`, so their text is not selectable.
The YouTube tab is a WebView page with no `user-select` rule, so WebKit selected words under a double tap or a long press.

## Change

`YouTubeEmbed.kt` sets `-webkit-user-select: none`, `user-select: none`, and `-webkit-touch-callout: none` on `body`, and sets them back to `text` and `default` on the lyric window (`#lyric-window`), the original line in the 음차 editor (`#pronunciation-edit-source`), and `input` and `textarea`.
Candidate previews in the lyric list cannot be selected either, because they sit inside the buttons that choose a candidate.

## Checks

| Check                                                         | Result                                                |
| ------------------------------------------------------------- | ----------------------------------------------------- |
| `node --test tools/test-youtube.mjs`, with a new CSS test     | 142 tests pass; the new test failed before the change |
| iOS simulator build (the README `xcodebuild` command), exit 0 | built with and without the change                     |

On the iPhone 17 Pro simulator, with idb, the build without the change selected "찾기" in the "노래 찾기" heading after a long press and a double tap on the YouTube tab.
The build with the change showed no selection after the same gestures, and typing into the song search field still worked.
Timed lyric lines are buttons that seek on tap, so a long press or double tap on them seeks instead of selecting, before and after the change.
Android was not run for this change; Android WebView supports the same properties.
