# SingBridge

An offline Kotlin Multiplatform baseline for practicing foreign-language songs with readable pronunciation.

Project ID: `sing_bridge`.
Account scope: personal.

## Current experience

- One original Japanese practice verse with manually authored Hangul pronunciation.
- A bundled 28-second instrumental timing guide with a two-second count-in.
- Real Android Media3 and iOS AVPlayer playback.
- Playback position, seeking, current-line highlighting, selected-line repeat, and lyric hiding.
- Playback pauses when the app leaves the foreground.

The sample has no vocals.
Its pronunciation and timing are authored demonstration data, not automatic transliteration or alignment.
Practice state lasts for the current screen session.
Commercial songs, streaming providers, accounts, recording, speed adjustment, and persistent progress are outside this baseline.

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
For future repository setup, `/init` can review agent guidance and `$setup-trunk` can add a pre-commit quality gate.
No Git hooks are configured by this baseline.

See `docs/notes/2026-09-27-verification.md` for checks actually performed and remaining limits.
