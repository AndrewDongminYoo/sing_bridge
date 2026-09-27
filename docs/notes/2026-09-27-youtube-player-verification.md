# YouTube player verification

Scope: local working tree on `feat/youtube-player-spike`, based on merged `main` at `419a777`.
No new dependencies or storage schema changes.

## Automated checks

- `node --test tools/test-youtube.mjs`: 9 tests pass against the JavaScript extracted from the actual shared HTML source.
- Initial stub rejected a valid ID; subsequent state tests required the unimplemented event handlers.
- Review regression: error 153 was overwritten by the loading timeout; the new test failed before the per-generation settled flag and passes after it.
- Final source: `./gradlew --no-daemon :shared:jvmTest :androidApp:assembleDebug :androidApp:lintDebug -Pkotlin.incremental=false` passed with 25 shared tests, zero failures, and zero errors.
  The XML report includes the passing `leavingPracticeAtTrackEndDoesNotRestartRepeat` regression.
- Android Lint reports three warnings in unchanged configuration/source: OldTargetApi, DataExtractionRules, and UseKtx at LastSongStore.kt:50.
- Unsigned arm64 iOS simulator host: `xcodegen generate --spec iosApp/project.yml` followed by the README's `xcodebuild` command passed.
- Separate read-only native and shared-code reviewers completed; the timeout finding was repaired and rechecked.
- Before the final practice-exit fix, Trunk checked 39 files successfully.
- A subsequent scoped Trunk check of the six changed Kotlin and Markdown files passed.
- Project-instruction diagnostics: `codex doctor --summary --ascii --no-color` reported 1 warning, 0 failures, and 3 notes.
  This is an advisory diagnostic, not evidence that app behavior passes.

The controlled player tests prove input/state behavior, not network availability, media decoding, policy approval, or timing precision.

## Android runtime

Pixel_10 emulator, Android system WebView, debug APK installed over the existing app.
Entered the official IFrame documentation's sample ID `M7lc1UVf-VE` through the actual screen.
The real player loaded with branding and controls, reported roughly 22:24 duration, and advanced playback.
The five-second-forward action changed the observed display from 0:11 before the tap to 0:17 after the UI dump.
This checks seeking, not request-to-settled latency: UI automation and elapsed playback are included in that interval.

After Home, an inspection through the debug WebView's CDP endpoint reported `foreground=false`, `document.hidden=true`, player state 2 (paused), and time 19.357103 seconds.
A later inspection returned the same paused time.
The page was not a simulated player.

Unavailable ID `aaaaaaaaaaa` produced actual player error 150 and the alternative-video explanation.
Entering the official sample again recovered to ready state.
Closing the screen returned to the paused local sample with 0:00 / 0:28.
The debug forwarding port was removed, the app stopped, and the session-owned emulator shut down.

Local screenshots and hierarchy dumps are ignored under `build/qa/import/android-youtube*.png` and `build/qa/import/youtube-*.xml`.
No copyrighted song text was added.

## iOS runtime

First bounded MCP worker pass exited 0 and shut down its iPhone 17 Pro iOS 26.5 simulator.
The shared page rendered with input and button; closing returned to the local sample paused at 0:00 / 0:28.
Its accessibility snapshot did not expose HTML input/player controls, so that pass did not establish actual video playback, seeking, or background behavior.
Artifacts: `build/qa/youtube/01-home.jpg`, `02-youtube-entry.jpg`, `03-local-paused-after-close.jpg`.

The initial runtime builds predate the final `fs=0` player parameter and the practice-exit fix described below.
Android and iOS compilation after both changes passed.
The final iOS host build ended with `BUILD SUCCEEDED`.
The second dedicated MCP worker installed and launched that final build, observed the YouTube sheet, exited 0, and confirmed simulator shutdown.
It could not enter the video ID: this profile's text-input action requires an accessibility reference, and no coordinate-tap action was available.
Screenshots from that pass include `build/qa/youtube/02_youtube_sheet.jpg` and `04_after_simulator_foreground.jpg`.

A separate Computer Use fallback failed during tool startup with `Sky Computer Use native pipe startup failed`, before any UI interaction.
The root confirmed native app launch and then shut down the simulator again.
Those attempts did not verify actual iOS video loading or playback.
These were automation blockers; neither worker exit 0 nor a successful app launch proves media playback.
No physical device was used and no unrelated process was terminated.

The operator then requested another installation and launch.
The final build was installed over the existing app and launched on the iPhone 17 Pro virtual device; the home screen was captured in `build/qa/youtube/operator-launch.png`.
The app and device were left running for manual inspection.
The operator subsequently confirmed that YouTube loading and video playback both work.
This is operator-reported runtime evidence, separate from the automated checks above.
The operator's accompanying screenshot shows a rendered video, the playing status, a 0:54 / 4:05 time display, and enabled five-second seek buttons.
The screenshot establishes the displayed state; it does not by itself prove seek or background behavior.
The operator subsequently confirmed five-second seeking and background/return behavior as well.
iOS loading, playback, seeking, and background/return checks therefore have operator-reported passing evidence.
Unavailable-video recovery on iOS remains unconfirmed.

The operator clarified that this Mac's updated environment integrates the former Simulator application into DeviceHub.
The installed DeviceHub application was found and opened at `/Applications/Xcode.app/Contents/Applications/DeviceHub.app`.
Use DeviceHub for the graphical device window in this environment; `simctl` remains available for the native commands used here.

## Final practice-exit regression and recovered verification

Opening the iOS sheet leaves the local practice poller mounted.
At the end of a track, pausing alone could let enabled line repeat restart playback behind that sheet.
The shared entry action now calls `leavePractice`, which disables repeat before pausing the local player.
The separate shared-code reviewer rechecked this source change and returned CLEAR.
That review does not replace execution of the regression test.

With a pause-only implementation, the new `leavingPracticeAtTrackEndDoesNotRestartRepeat` test failed through JUnitCore: 11 tests ran and that test failed because playback restarted.
The classes used for this run had just been compiled from the test source.
Evidence: `build/qa/youtube/navigation-red-junit.txt`.
After the machine load recovered, the corrected implementation passed in the full 25-test Gradle suite.

The normal Gradle attempt encountered a missing incremental classpath snapshot.
A second attempt with `-Pkotlin.incremental=false` compiled the source and tests but could not load `worker.org.gradle.process.internal.worker.GradleWorkerMain`.
No global cache deletion or termination of other sessions was performed.
A fresh-daemon verification was then queued for at most 300 seconds while waiting for the one-minute load to fall to the machine's 10-core count.
The load stayed above that threshold, so the queue exited 75 without launching the build.

The successful retry used a fresh single-use daemon without deleting global caches:

```sh
./gradlew --no-daemon :shared:jvmTest :androidApp:assembleDebug :androidApp:lintDebug -Pkotlin.incremental=false
```

The iOS host was then rebuilt successfully with the README command.
Final logs: `/tmp/sing_bridge-youtube-navigation-green.log` and `/tmp/sing_bridge-youtube-navigation-ios.log`.
The remaining manual iOS checks are closing a loaded player and confirming local practice remains paused, and replacing an unavailable video with a valid one.

## Remaining limits

No precise seek-latency distribution, A/B-repeat overshoot measurement, real-device audio output, minimum-OS matrix, or commercial-video coverage study.
No YouTube-to-lyrics synchronization or pronunciation integration.
The existing iOS local Files selection → copy → import playback gap is separate and remains open.
Full-screen playback is outside this inline spike.
