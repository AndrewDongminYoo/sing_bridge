# Fewer panel reopenings: verification

<!-- cspell:words devicectl -->

Issue: #86. Spec: [fewer panel reopenings](../specs/2026-10-03-fewer-panel-reopenings.md).

## Page tests

Five tests were added to `tools/test-youtube.mjs`.
Before the page change, the two behavior tests failed as expected: the song-search test (the panel stayed closed after `onReady`) and the candidate test (the panel closed after the choice).
The three tests for paths that must stay closed passed before the change, so each guard was then removed one at a time to confirm that some test fails without it:

| Guard removed                                            | Failing test                                                               |
| -------------------------------------------------------- | -------------------------------------------------------------------------- |
| all `onReady` guards (sequence, screen, foreground)      | stays closed when the user left, searched again, or went to the background |
| `foreground && !document.hidden`                         | the same test                                                              |
| `searchVersion === searchSequence`                       | the same test                                                              |
| `chosen` (a saved record opened while the panel is open) | direct link, share code, saved practice, fallback                          |
| restored layer covering every line                       | closes without pronunciation, plain lyrics, or a complete layer            |
| `pronunciationAvailable`                                 | the same test                                                              |

A `textLines > 0` guard caught no test because `pronunciationResults.size < textLines` already excludes plain lyrics, so it was removed.

`node --test tools/test-youtube.mjs server/pronunciation.test.mjs`: 184 tests, 184 passed, on 2026-10-03.
The default fixture has pronunciation unavailable, so the existing tests that choose a candidate and then expect a closed panel pass unchanged; no existing test was modified except the fake DOM node, which gained `focus` and `scrollIntoView`.

## Native checks

- iOS: `xcodegen generate` and the README's Debug simulator `xcodebuild` succeeded, and the app was installed over the existing one on iPhone 18 Pro `88F93347-37E2-4EE9-9C1C-86E89C6896AE`.
  The check itself was not done: within about four minutes of booting the simulator, the load average rose from 7 to 237 and swap reached 13.2 of 14 GB with about 75 MB of free memory, and an `idb ui tap` did not return within 120 seconds.
  The simulator was shut down to protect the other sessions on the machine.
  A second attempt the same day, with a rebuilt Debug app at `fb23d4c`, reached a load average of 158 within a minute of booting, and `simctl install` did not finish within 90 seconds; the simulator was shut down again.
- iOS device: the Debug build of `main` at `dd7872f` (the #88 merge, the same tree as `fb23d4c`) was installed over the existing app on the operator's iPhone 16 Pro, iOS 27.0.1, with `xcrun devicectl device install app`; the output had no uninstall step.
  The operator checked it on 2026-10-03 against five items given to him and reported that it works as intended; the items were: a song search opens the dialog without a tap and without the keyboard, playback does not run while it is open or start when it closes, choosing a candidate closes the dialog, and a direct link or saved practice leaves it closed.
  A physical iPhone has no pronunciation bridge (`DEBUG && targetEnvironment(simulator)`), so this covers the closing branch of the candidate rule, not the branch that keeps the dialog open on **음차 만들기**.
- Android emulator, 2026-10-04: a debug APK built from `main` at `7f2f92e` (same page code as `dd7872f`) was installed on the Pixel_10 AVD (Android 17, en-US, 1080x2424), where the app was not installed before.
  After a search for `Vaundy - odoriko`, the dialog opened without a tap once the player was ready, the keyboard was down, and the video details and candidates were shown.
  Choosing the synced LRCLIB record 35923881 kept the dialog open with the candidate list collapsed and **음차 만들기** enabled and in view.
  The page state was read through the WebView DevTools socket of the debug build: `document.activeElement` was `pronunciation-generate`, the reading language was `en`, and the player state was 5 (cued).
  After **닫기**, the dialog was closed and the player stayed at state 5 and 0:00, so playback did not start.
  No pronunciation was generated, so the development server was not needed.

Acceptance item 4 of the spec is met: the dialog opening, the absent keyboard, and playback staying stopped were checked on the iOS device and the Android emulator, and **음차 만들기** staying in view and focused was checked on the Android emulator.
The iOS Debug simulator check was not done.
