# Search-first navigation verification

Spec: [search-first navigation](../specs/2026-09-30-search-first-navigation.md).

## Change

- `AppNavigationBar.kt` labels the tabs 노래 찾기, 연습, and 내 노래, with a magnifier, microphone, and list icon.
- Android `MainActivity.kt` orders the pages as the YouTube view, the Compose practice screen, and the import screen, opens on `SEARCH_TAB`, returns to `PRACTICE_TAB` after a successful import, and sends Back to `SEARCH_TAB`.
- iOS `SingBridgeApp.swift` orders the tab controllers the same way, with the SF Symbols `magnifyingglass`, `music.mic`, and `music.note.list`, returns to the practice tab after an import, and applies the tab visibility once at launch, because the YouTube page is now selected before any tab change.
- README and CLAUDE.md use the new tab names.

## Checks

| Command                                                                                     | Result                      |
| ------------------------------------------------------------------------------------------- | --------------------------- |
| `./gradlew :shared:jvmTest :androidApp:assembleDebug :androidApp:lintDebug`                 | `BUILD SUCCESSFUL`, exit 0  |
| `node --test tools/test-youtube.mjs server/pronunciation.test.mjs`                          | 142 tests, 142 pass, exit 0 |
| `xcodegen generate --spec iosApp/project.yml`, then the README simulator `xcodebuild` build | `BUILD SUCCEEDED`, exit 0   |

On the Pixel_10 emulator, the app opened on 노래 찾기 with the tabs in the new order, 연습 showed the sample practice screen, and Back from 연습 returned to 노래 찾기.
On the iPhone 17 Pro simulator, the app opened on 노래 찾기, a saved practice opened from that first screen with its video and lyrics, and 연습 showed the sample practice screen.
The import path back to 연습 was not run on a device; it uses the same tab constant as the checked paths.
