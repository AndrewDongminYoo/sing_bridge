# Practice controls and screen separation

## Approved changes

The operator requested lyric candidates ranked by video duration, easier offset adjustment, separate song-search and playback screens, and single-song repeat by default.
The implementation reuses the existing shared HTML and official player without dependencies or extra Data API calls.
Personal project Oracle retrieval for lyric timing and duration matching returned `[no precedent found]`; no unrelated precedent was applied.

## Implementation

Discovery contains artist/title search and direct links.
Opening a video shows practice with the official player, repeat toggle, lyrics, and timing controls.
Returning to discovery pauses playback; returning to practice keeps the video and lyrics paused and cancels any unfinished new song search.
Search errors stay visible on discovery; player errors stay on practice.

Lyric candidates are filtered and ranked across the bounded response before rendering the best 20 by absolute duration difference.
Unknown candidate durations sort last, ties preserve provider order, and missing video metadata temporarily preserves provider order.
Whole-second changes in the player's reported duration update the ranking while preserving the chosen lyrics; focused result controls defer that update.
The live player initially reported 246 seconds and later 245.401 seconds, which motivated a regression test for refined metadata.

The timing controls change the lyric offset by 0.5 seconds without seeking audio.
Reset returns the original timestamps, boundaries remain ±600 seconds, and precise numeric entry is available in a collapsed detail section.
Single-song repeat uses the official loop and playlist parameters plus setLoop for the toggle.
The default is enabled for a new YouTube screen session; returning between discovery and practice retains the toggle.
Foreground and visibility guards still pause playback.

## Verification

`node --test tools/test-youtube.mjs` passed 42 controlled shipped-script tests.
New cases failed before implementation, then passed for ranking beyond the old first-20 cutoff, stable ties, unknown lengths, delayed/refined metadata, offset direction/reset/bounds, screen changes, stale search cancellation, and repeat toggling.
The controlled player records loop calls and pause calls; it does not simulate actual provider end-of-video behavior.

Real-browser checks at 393 by 852 pixels used official YouTube playback and live LRCLIB results.
The search screen contained only discovery controls; the practice screen hid those inputs.
For the initially reported 4:06 video, candidates appeared with differences 0, 1, 3, and larger numbers of seconds.
A selected timed lyric displayed correctly, and clicking the earlier button produced -0.5 seconds with focus on a button rather than a numeric input.
Returning to discovery produced player state 2; returning to practice retained that paused state and the offset.
No horizontal overflow was observed.

With repeat enabled, a seek near the real video's end followed by a six-second observation returned to 2.7445 seconds in playing state 1.
With repeat disabled, the same check stopped at 245.401 seconds in ended state 0.
The official playlist contained only the selected video ID.
These observations verify provider repeat behavior independently of the controlled tests.

Screenshots are ignored under `build/qa/timing/search.png`, `practice-results.png`, and `sync-buttons.png`.
The browser session and local server were closed, and the real key was replaced with a fixture value in the QA page.
Credentials were not printed.

JVM tests, Android assembly and lint, and the unsigned iOS host build passed during this change.
The final three-line return-to-practice cancellation repair was covered by the 42-test JavaScript run and final iOS build; the Android build preceded that repair.
Scoped Trunk and `git diff --check` passed.
A local structured review checked hidden-player pause rules, asynchronous search cancellation, provider-text rendering, duration reordering, and timing boundaries.
No outstanding finding remained in those paths.

The revised native screens and repeat toggle still require operator interaction after installation; the previous operator confirmation covered the earlier search/playback/lyric-selection build.
Browser runtime evidence is separate from native runtime evidence.
