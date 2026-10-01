# Android navigation bar and overscroll verification

Issue: #75.

## Change

- `AppNavigationBar` draws a 1 dp line in the page border color `#C6D0C9` along its top edge; the bar keeps the paper color `#FAF7F0`.
  Only the Android host renders this composable, so iOS is unchanged.
- The 연습 and 내 노래 Compose screens on Android run inside `NoOverscroll` (`shared/src/androidMain`), which provides `LocalOverscrollFactory` as `null`; the shared composables, which iOS also uses, are unchanged.
- The 노래 찾기 WebView sets `overScrollMode` to `OVER_SCROLL_NEVER`.

## Build

`./gradlew :androidApp:assembleDebug :androidApp:lintDebug :shared:jvmTest` passed.
Lint reports the same 7 warnings as `main`; none is in the changed code.

## Emulator check

Pixel_10 emulator (1080x2424), headless.
The before run used the build already installed from `main` plus #66; the after run used this branch's debug APK, installed over it with `adb install -r`.

For each tab, a script captured the screen at rest at the top end, then 1.6 seconds into a 3-second swipe that pulls past the top end, and did the same at the bottom end after two flings.
It counted changed pixels between the rest and pull frames with ImageMagick `compare -metric AE -fuzz 3%`, over the content area only (y 160 to 2040, above the navigation bar).

| Tab       | End    |  Before | After |
| --------- | ------ | ------: | ----: |
| 노래 찾기 | top    |  87,143 |     0 |
| 노래 찾기 | bottom | 124,479 |     0 |
| 연습      | top    |  53,291 |     0 |
| 연습      | bottom |       0 |     0 |
| 내 노래   | top    |       0 |     0 |
| 내 노래   | bottom |       0 |     0 |

- The before frames with changes showed the content stretched vertically, so the count measures the stretch.
- On 노래 찾기 the rest frames at the top and bottom ends differ by about 134,000 pixels in both runs, so the page did scroll and the zero after the change is not a missed swipe.
- The 연습 bottom-end swipes start on the fixed playback controls, and the 내 노래 import screen fits on this screen, so those rows show no change before or after and do not test the change.
- A crop of the bar region shows no boundary before and a gray line above the bar after.
  At full screen scale the 1 dp line is faint.

## Not checked

- iOS, which this change does not touch.
- 내 노래 at a text size large enough to make it scroll, and the bottom end of the 연습 lyric list.
