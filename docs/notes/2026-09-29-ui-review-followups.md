# UI review follow-up checks

Follows the [UI review](2026-09-29-ui-review.md), whose remaining gaps Andrew chose to close on 2026-09-29: the iOS status bar strip, Android text size, and an Android emulator check.

## Android text size

On the Pixel_10 emulator (1080x2424, density 420), a debug build from before #45 was installed, and the YouTube tab was captured at `settings put system font_scale` 1.0 and 2.0 after a relaunch.
At 2.0 the page heading and body text were clearly larger, and the screenshots differed, so Android WebView already follows the system font scale without a `textZoom` setting.
The review note's gap ("the page does not read the Android font scale") was wrong, and no change was made for it.
The font scale was restored to 1.0.

## System bar strips

On both platforms the area behind the status bar showed the system background instead of the page's paper color `#faf7f0`, and on Android the gesture area under the navigation bar did too.

- iOS: `YouTubeScreen.swift` draws the paper color behind the WebView with `ignoresSafeArea()`, so the page stays inside the safe area and the strip matches it.
- Android: `MainActivity.kt` gives the root layout the paper color, because the system-bar padding on that layout is what shows behind the status bar and the gesture area.

## Checks

| Command                                                                                     | Result                     |
| ------------------------------------------------------------------------------------------- | -------------------------- |
| `./gradlew :androidApp:assembleDebug :androidApp:lintDebug`                                 | `BUILD SUCCESSFUL`, exit 0 |
| `xcodegen generate --spec iosApp/project.yml`, then the README simulator `xcodebuild` build | `BUILD SUCCEEDED`, exit 0  |

On the emulator, the fixed build showed paper-colored strips above Home and the YouTube tab and below the navigation bar, "일본어 → 한글 음차" on Home, and 영상 열기 as a secondary button.
The emulator had no saved practice, so the lyrics panel was not opened on Android; its order is shared page markup that the iOS check and the page tests cover.
On the iPhone 17 Pro simulator, the fixed build showed the paper color behind the status bar on the YouTube tab, where the #45 build showed white.
