# SingBridge

A Kotlin Multiplatform song-practice baseline with local audio and a separate visible YouTube player with optional LRCLIB lyrics.

Project ID: `sing_bridge`.
Account scope: personal.

## Current experience

- One original Japanese practice verse with manually authored Hangul pronunciation.
- A bundled 28-second instrumental timing guide with a two-second count-in.
- Real Android Media3 and iOS AVPlayer playback.
- Playback position, seeking, current-line highlighting, selected-line repeat, and lyric hiding.
- Playback pauses when the app leaves the foreground.
- Import an audio file and UTF-8 LRC through the system document picker.
- Restore the last imported song after relaunch from an app-private copy.
- Open a YouTube video URL in the official embedded player, view its playback time, and seek five seconds.
- Search LRCLIB, select a lyric record, and adjust its timing against the video.

The sample has no vocals.
Its pronunciation and timing are authored demonstration data, not automatic transliteration or alignment.
Practice state lasts for the current screen session.
The last imported audio and source LRC are saved locally; returning to the sample removes that saved song.
Commercial lyric licensing, streaming catalog search, accounts, recording, speed adjustment, and persistent progress are outside this baseline.

## YouTube playback and lyrics

Choose **YouTube 영상 열기**, paste an HTTPS YouTube link or video ID, and tap the official player to start.
This separate screen requires internet access and does not generate pronunciation.
Search by song and artist, then choose the matching LRCLIB result after checking its title, artist, album, duration, and lyric type.
Timed lyrics follow the actual player position; positive time adjustments show lyrics later and negative adjustments show them earlier.
Plain lyrics are displayed without synchronization.
The player stays visible while scrolling through lyrics.
Changing videos clears the selected lyrics and adjustment; closing the screen discards the results.
Lyrics stay in screen memory and are not saved in the imported-song library.
API access and attribution do not establish rights to distribute commercial lyrics; release clearance remains unresolved.
The original local song stays saved and paused, with line repeat turned off on entry.
The app pauses the video on background or when less than half the player is visible; returning does not resume automatically.
Embedding restrictions and network failures may prevent a video from playing.
The native hosts identify the app through their HTML base URL and use no audio extraction or JavaScript-to-native bridge.
See [scope](docs/specs/2026-09-27-youtube-player.md) and [verification](docs/notes/2026-09-27-youtube-player-verification.md).
See [lyrics scope](docs/specs/2026-09-27-youtube-lyrics.md) and [lyrics verification](docs/notes/2026-09-28-youtube-lyrics-verification.md).
Run `node --test tools/test-youtube.mjs` to test the shipped page logic with a controlled player and network responses.

## Import a song

Choose **내 노래 불러오기**, select an audio file, then select the matching LRC.
Audio must be decodable by the native platform and at most 256 MiB; LRC must be UTF-8 and at most 1 MiB.
The app copies audio into private storage and uses its measured duration.
The original files are not modified, and broad storage permissions are not requested.
Cloud file providers may need to download a selected file first.
The Files/document picker is supported; Apple Music library and DRM-protected media are not import sources.

Supported LRC includes minute/second timestamps with optional two- or three-digit fractions, repeated timestamps, and common metadata.
Simultaneous lines are combined; empty timestamped lines end the preceding lyric.
Nonzero offsets, word-level enhanced LRC, malformed timestamps, and out-of-range lyrics are rejected with an explanation.
Imported lyrics display original text only; pronunciation is not generated.
The saved format contains source LRC rather than pronunciation layers, leaving future derivation independent of this storage version.

Cancellation, invalid lyrics, and a failed manifest write keep the previous song.
**샘플곡으로** clears the saved import and returns to the bundled verse.
See `docs/specs/2026-09-27-local-import.md` for the supported subset and limits.

## Structure

```plaintext
androidApp/                  Android application host
shared/src/commonMain/       Shared Compose UI and practice behavior
shared/src/commonTest/       Behavior tests using a controlled playback adapter
shared/src/androidMain/      Media3 playback adapter
shared/src/iosMain/          AVPlayer adapter and Compose view controller
iosApp/project.yml          Source configuration for XcodeGen
iosApp/SingBridge/           SwiftUI application host
tools/generate_sample.py     Reproducible sample-audio source
docs/specs/                  Agreed baseline scope
docs/plans/                  Execution plan
docs/notes/                  Verification evidence
```

## Prerequisites

Use a JDK supported by Gradle 9.3.1, Android SDK 36, and Android Build Tools 36.0.0.
For iOS, use macOS with Xcode, an installed iOS simulator runtime, and XcodeGen.
The deployment targets are Android API 26 or later and iOS 17.2 or later.
Simulator builds target Apple Silicon.
The JVM target exists for tests only.

Set `JAVA_HOME` to your JDK before invoking Gradle or Xcode.
On a Mac with Android Studio installed, its bundled runtime can be used:

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
```

Set the Android SDK path in the ignored `local.properties` file:

```properties
sdk.dir=/absolute/path/to/Android/sdk
```

## Android

Open this directory in Android Studio, sync Gradle, and run `androidApp` on an emulator.
To build and check from a terminal:

```bash
./gradlew :shared:jvmTest :androidApp:assembleDebug :androidApp:lintDebug
```

The debug APK is `androidApp/build/outputs/apk/debug/androidApp-debug.apk`.
Use an explicit emulator ID to install it:

```bash
adb -s emulator-5554 install -r androidApp/build/outputs/apk/debug/androidApp-debug.apk
adb -s emulator-5554 shell am start -n io.github.andrewdongminyoo.singbridge/.MainActivity
```

## iOS

Generate the Xcode project from its source configuration:

```bash
xcodegen generate --spec iosApp/project.yml
```

Open `iosApp/SingBridge.xcodeproj`, choose the SingBridge scheme and an iOS simulator, then run.
The Xcode build phase compiles and embeds the shared Kotlin framework and Compose resources.
The generated Xcode project is ignored and should not be edited directly.
Physical-device signing requires your own development team configuration.

To check a simulator build without device signing:

```bash
xcodebuild -project iosApp/SingBridge.xcodeproj -scheme SingBridge \
  -configuration Debug -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath build/ios ARCHS=arm64 CODE_SIGNING_ALLOWED=NO build
```

## Dependencies

Versions are pinned in `gradle/libs.versions.toml` and the Gradle wrapper.
Compose supplies the shared UI and resources.
Media3 supplies Android playback and audio-focus handling.
Coroutines poll actual playback position for lyric highlighting.
AVPlayer is supplied by iOS.
No third-party playback wrapper, networking client, database, or backend is required.

When changing dependencies, resolve the tested configurations and regenerate their lockfiles:

```bash
./gradlew :shared:jvmTest :androidApp:assembleDebug :androidApp:lintDebug \
  :shared:linkDebugFrameworkIosSimulatorArm64 --write-locks
```

Run native build jobs sequentially on memory-constrained machines.

## Hosted Linux setup

`setup.sh` prepares Android SDK 36 and Build Tools 36.0.0 in a Linux x86_64 container with an existing JDK supported by Gradle 9.3.1.
It reuses a configured Android SDK when possible and otherwise downloads checksum-pinned Android command-line tools.
The download path requires `curl`, `unzip`, and `sha256sum`; the script reports any missing prerequisite by name.
SDK environment overrides are normalized with GNU Coreutils `realpath`, including paths that do not exist yet.
The default local SDK directory and generated environment file are ignored by Git.
iOS builds require macOS and are not part of Linux setup.

```bash
bash ./setup.sh
source ./.singbridge-env
./gradlew :shared:jvmTest :androidApp:assembleDebug :androidApp:lintDebug
```

For Codex hosted environments, use `bash ./setup.sh` as the repository setup command.
The setup shell does not export variables into later agent shells; source `.singbridge-env` before running Gradle in those shells.
Linux ARM64 is not supported by this Android setup script.

## Continuous integration and quality checks

`.github/workflows/ci.yml` defines checks for pull requests, pushes to `main`, and manual runs.
The workflow checks shared behavior and Android builds on Linux, builds the unsigned iOS simulator host on macOS, and runs Trunk separately.
GitHub Actions execution is distinct from the local checks recorded in `docs/notes/2026-09-27-automation.md`.

Trunk checks workflow syntax with actionlint, owned shell scripts with ShellCheck, Markdown with markdownlint, and Kotlin source and scripts with ktlint.
Ktlint uses managed Java, the Android Studio code style, Compose-aware function naming, and trailing commas from `.editorconfig`.
A SARIF lint command supplements the pinned plugin formatter so non-fixable rules also fail the gate.
Gradle remains responsible for Kotlin compilation and Android lint.
The generated Gradle wrapper is excluded only from ShellCheck.

```bash
trunk check --no-fix
```

The pre-push Trunk check is enabled.
Automatic pre-commit formatting is disabled.
Use `trunk actions list` to inspect local hook installation.

## Sample provenance

The short practice verse, Hangul pronunciation, melody, and waveform generator were authored for this project.
No commercial lyric service, copyrighted recording, downloaded audio, or synthesized third-party voice is bundled.
To regenerate the audio after editing its source:

```bash
python3 tools/generate_sample.py
```

The player reports actual media time.
The UI does not advance an independent simulation clock.
Line intervals are start-inclusive and end-exclusive, so the count-in and ending have no active lyric.
Automatic pronunciation generation requires language-specific reading rules and human review before expansion.

## Project guidance

`AGENTS.md`, this README, and `docs/{notes,plans,specs}` provide the initial repository baseline.
For future repository setup, `/init` can review agent guidance.
Trunk configuration lives in `.trunk/`.

See `docs/notes/2026-09-27-verification.md` for checks actually performed and remaining limits.
See [YouTube player verification](docs/notes/2026-09-27-youtube-player-verification.md) for the embedded-player checks and runtime limits.
