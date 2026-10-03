# Fewer panel reopenings: verification

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
- Android: not started.

Acceptance item 4 of the spec (dialog opening without a tap, no keyboard, **음차 만들기** in view, no playback on close) is still open on both platforms.
