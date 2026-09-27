# Local import verification

## Contract and provenance

The operator selected local audio and LRC import, then approved restoring the last imported song after relaunch.
Implementation uses the existing workspace, native document pickers, private audio copies, and the existing playback adapters.
No new dependency, commercial lyric source, physical-device write, or background playback was introduced.
Personal project Oracle searches for local audio and LRC import returned `[no precedent found]`; no source path was available.

## Shared behavior

The JVM suite reads parser output and controlled player/resource transitions; it does not decode native audio.
An initial stub run failed 8 of 18 tests.
Independent review then identified that a character-count bound did not enforce a UTF-8 byte limit; a multibyte regression failed before adding the byte check.
A persistence-failure test failed before adding transactional manifest commit handling.
A failed-restore cleanup test failed before clearing the retained draft on sample reset.
The final suite passed 23 tests with zero failures and errors: 10 existing practice tests, 5 parser tests, and 8 import ownership tests.

## Build and static checks

`JAVA_HOME='/Applications/Android Studio.app/Contents/jbr/Contents/Home' ./gradlew :shared:jvmTest :androidApp:assembleDebug :androidApp:lintDebug` passed after the final source change.
Android Lint initially rejected `MediaMetadataRetriever.use` on API 26; explicit `release()` fixed that compatibility issue.
The final report retains the baseline's `OldTargetApi` and `DataExtractionRules` warnings.
The generated Xcode project and unsigned arm64 simulator host built successfully with the README command after the final change.
These results establish compilation, linking, and static compatibility, not minimum-OS runtime behavior.
Trunk checked the changed Markdown without fixes; `git diff --check` passed.

## Android runtime

The Pixel_10 emulator at `emulator-5580` ran the debug APK.
Fixtures consist of a 12-second excerpt of the project's original generated WAV, an original three-line multilingual LRC with a silent interval, and an invalid offset LRC.
The UI assertion helper first rejected an empty hierarchy fixture as expected.
One immediate post-launch hierarchy request returned no root; the helper was tightened to remove the old dump and require a fresh successful dump, and the affected check was repeated successfully.

Observed through native hierarchy dumps and screenshots:

- The system document picker selected the audio and LRC files.
- Nonzero offset produced the intended error, and selecting a valid LRC completed import.
- The imported screen showed the file name, original lyrics, and `0:00 / 0:12` rather than the sample's duration.
- Selecting and repeating the second interval kept playback within that interval after multiple passes; pausing showed `0:04 / 0:12`.
- Lyric hiding and revealing worked with imported text.
- Renaming both original fixture paths, force-stopping the app, and relaunching still restored the copied song at zero while paused.
- Canceling the import dialog retained the imported song.
- Returning to the sample and relaunching showed the sample and `0:00 / 0:28`.
- The app-private import folder was empty after sample reset, and the queried crash log buffer was empty.

Local, ignored evidence is under `build/qa/import/`, including `android-imported.png`, `invalid-lrc.xml`, `repeated.xml`, `hidden.xml`, `restored-fresh.xml`, `canceled.xml`, and `sample-restored.xml`.
The session-owned emulator was shut down after verification.
The last shared-only cleanup change was verified by its regression test and both builds; it does not change the successful import UI exercised above.

## iOS runtime

The final simulator build was installed and launched on iPhone 17 Pro with iOS 26.5.
The dedicated iOS MCP worker confirmed that the import action opens the Files picker and canceling returns to the import dialog.
It also exercised sample playback through its end and verified that terminating and relaunching resets it to `0:00 / 0:28`, paused.
The worker could not stage fixtures into a Files-provider location, so selecting actual audio and LRC through the iOS picker remains unverified.

Separately, a controlled copy and version-1 manifest were seeded into this app's initially absent `Library/Application Support/SingBridge` directory.
Launching the app restored `Import-check.wav`, its multilingual source lyrics, and `0:00 / 0:12` with an enabled play action and no autoplay.
Screenshot: `build/qa/import/ios-restored-fixture.png`.
This checks manifest decoding, native duration loading, common parsing, and rendered restoration; it bypasses the document import/copy/save pipeline.
The seeded files were removed after terminating the app, and the session-owned simulator was shut down.
No iOS end-to-end import, imported-song playback, or sample-reset deletion check is claimed.

## Review and limitations

Two independent read-only reviews covered shared parsing/session behavior and native file/player lifetimes.
The native review prompted releasing the player before removing its private audio copy during sample reset.
A restore/import race report was checked against the existing busy-state button guards and closed with current-source evidence.
Both reviewers reported no remaining P1/P2 findings in their scoped final pass; the root additionally added the failed-restore cleanup regression.

Physical speaker output, minimum supported OS versions, large cloud-provider downloads, disk-full device behavior, and DRM-protected media were not exercised.
Persistence failure is covered by a controlled failure callback, not an actual full disk.
Automatic pronunciation, multiple simultaneous vocal parts, word-level timing, and third-party playback remain outside this PR.

## Hosted offset review

The signed and padded zero-offset regression failed before the parser fix and passed afterward.
The updated shared suite passed 21 tests.
GitHub Actions passed JVM/Android, Trunk, and the iOS simulator host build for `71f313684283112b7d83feb84973434ea9444d30`.
This parser-only correction does not change the rendered import screen.

## Failed-restore replacement cleanup

A hosted review found a retained private copy when a saved LRC fails parsing and the user imports a replacement.
The Android emulator reproduced the failure through the actual system pickers: after a successful replacement, `song-failed.wav` remained beside the new manifest and audio.
The file assertion failed as expected before the fix.
Both platforms now remove unused copies only after `completeImport` returns without an error or pending draft, after the previous player has been released.
The same Android scenario passed after the fix: the directory contained only `current.json` and its referenced audio.
Returning to the sample then left the private import directory empty, and the session-owned emulator was shut down.
Shared tests, Android build/Lint, and the unsigned iOS host build were rerun for this correction.
The iOS cleanup call received source review and compilation coverage; its Files-picker runtime limitation above remains.

## Playback readiness before commit

Two regressions showed that an unready player or a ready player with an error could reach persistence and replace the previous song.
Both failed before the common readiness guard and passed afterward; the suite now contains 23 tests.
Android and iOS import/restore coordinators wait for a paused candidate to report ready without an error before passing it to the common commit path.
The wait is bounded to ten seconds, and a candidate not handed to the library is released on failure or cancellation.
The common guard independently rejects an unready or failed candidate before persistence.
These tests use controlled snapshots; they do not establish that every codec or truncated media payload is rejected before playback begins.
Android runtime confirmed successful system-picker import, playback, and paused restoration after force-stop through the new readiness path.
Returning to the sample cleared the private directory; the emulator was shut down.
The final correction passed shared tests, Android build/Lint, unsigned iOS compilation, and separate shared/native source reviews.
The iOS picker/runtime limitation remains unchanged.
