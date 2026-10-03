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
- Android: not started.

Acceptance item 4 of the spec is met on an iOS device except for **음차 만들기** staying in view, which needs the iOS Debug simulator or an Android debug build; the page tests cover that branch.
Android is still open.
