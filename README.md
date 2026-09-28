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
- Search YouTube by artist - title, open the top candidate, and search LRCLIB with the same terms.
- Select a lyric record and adjust its timing against the video.

The sample has no vocals.
Its pronunciation and timing are authored demonstration data, not automatic transliteration or alignment.
Unsaved practice state lasts for the current screen session.
The last imported audio and source LRC are saved locally; returning to the sample removes that saved song.
Commercial lyric licensing, accounts, recording, speed adjustment, and persistent progress are outside this baseline.

## YouTube playback and lyrics

Choose **YouTube 영상 열기**, search with **가수 - 제목**, or paste an HTTPS YouTube link or video ID.
Search opens the highest-ranked embedded-video candidate and searches LRCLIB with the original artist and title after player readiness.
Search and link entry are on a separate discovery screen.
Opening a video moves to the practice screen; **곡 찾기** pauses playback and returns to discovery.
**연습으로 돌아가기** preserves the current video and lyrics without resuming playback automatically.
Check the displayed video title and channel; relevance does not guarantee the intended recording.
Tap the official player to start; search never autoplays.
Single-song repeat is enabled by default and can be disabled with **한 곡 반복**; it resets to enabled when the YouTube screen is reopened.
This separate screen requires internet access and does not generate pronunciation.
Search by song and artist, then choose the matching LRCLIB result after checking its title, artist, album, duration, and lyric type.
Candidates are ranked by absolute duration difference from the player before limiting the display to 20 results.
Unknown candidate lengths follow known lengths; ties preserve provider order.
Until video metadata arrives, provider order is preserved.
Later duration refinements update ranking without replacing the selected lyrics; focused result controls defer reordering until focus leaves them.
Timed lyrics follow the actual player position; positive time adjustments show lyrics later and negative adjustments show them earlier.
Use **0.5초 일찍**, **0.5초 늦게**, and **초기화** without opening a keyboard.
Precise numeric entry remains under **시간 직접 입력** in the settings panel, bounded to ±600 seconds.
Plain lyrics are displayed without synchronization.
The practice screen fits the WebView viewport with the official video, lyrics, and bottom controls visible together.
Long lyrics scroll inside the reading area; the transport and timing controls stay in place.
Visible **재생 이동** and **가사 싱크** captions distinguish seeking from timing adjustment; search and save actions use primary buttons.
Timed lyrics form a stable list: the active row is emphasized and smoothly follows the actual playback position.
Touch, wheel, or keyboard reading suspends automatic following until four seconds after the last interaction; reduced-motion settings disable animated scrolling.
**가사 선택** or **가사·설정** opens a separate scrollable panel for lyric search, metadata, and precise timing entry.
Opening that panel pauses playback; choosing lyrics, closing it, or pressing Escape does not resume automatically.
In short landscape viewports, video and lyric controls sit side by side.
Search and link inputs disable automatic correction.
The player stays visible while scrolling through lyrics.
Changing videos clears the selected lyrics and adjustment; closing the screen discards the results.
Lyrics stay in screen memory and are not saved in the imported-song library.
Lyric candidates separate titles, artist/album metadata, script and sync badges, duration differences, and a two-line preview.
Kana-bearing lyrics group Kana and Han characters under **일본어**; Han-only lyrics retain **한자**, and mixed Latin text stays visible.
This is a display heuristic rather than language identification: Latin text can be English, romanized Japanese, or another language.
Use **이 연습 저장** in lyric settings to save a video ID, chosen LRCLIB ID, title, and timing offset on this device.
**저장한 연습** on discovery offers open and delete actions; up to 20 combinations are stored without automatic eviction.
After changing a saved offset, use **변경 내용 저장** to update it.
Reopening fetches the exact lyric ID and restores its offset without autoplay; internet access is required and changed or removed provider records can affect the result.
No lyric body, credentials, playback position, or account data is stored by this feature.
Invalid storage is preserved and reported; failed writes do not report success.
See [saved practice scope](docs/specs/2026-09-28-saved-practice.md).
API access and attribution do not establish rights to distribute commercial lyrics; release clearance remains unresolved.
The original local song stays saved and paused, with line repeat turned off on entry.
The app pauses the video on background or when less than half the player is visible; returning does not resume automatically.
Embedding restrictions and network failures may prevent a video from playing.
Search request failures keep the current video.
If a searched candidate fails before playback starts, the previous usable video and selected lyrics are restored without autoplay.
The native hosts identify the app through their HTML base URL and use no audio extraction or JavaScript-to-native bridge.
See [scope](docs/specs/2026-09-27-youtube-player.md) and [verification](docs/notes/2026-09-27-youtube-player-verification.md).
See [lyrics scope](docs/specs/2026-09-27-youtube-lyrics.md) and [lyrics verification](docs/notes/2026-09-28-youtube-lyrics-verification.md).
Run `node --test tools/test-youtube.mjs` to test the shipped page logic with a controlled player and network responses.

### Configure YouTube search

Enable YouTube Data API v3 for your Google Cloud project and add its API key to the ignored `local.properties` file:

```properties
YOUTUBE_API_KEY=your_api_key
```

Gradle generates the shared configuration under `shared/build`; neither the local file nor generated output belongs in Git.
Builds without a key retain direct-link playback and manual LRCLIB search.
Service-account credentials are not supported for this YouTube flow.
The key is included in configured client builds and can be extracted; apply API/application restrictions and quota controls before distribution.
No backend is introduced.
See [song-search scope](docs/specs/2026-09-28-song-search.md) and [verification](docs/notes/2026-09-28-song-search-verification.md).

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
