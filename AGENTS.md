# SingBridge

## Project identity

- Project ID: `sing_bridge`
- Account: personal (`AndrewDongminYoo`)
- Product name: SingBridge
- Runtime: Kotlin Multiplatform with Compose Multiplatform for Android and iOS.

## Scope

Build an offline song-practice baseline with original demonstration content.
Keep playback in platform adapters and practice decisions in common Kotlin.
Do not add commercial lyrics, streaming integrations, accounts, or a backend without a scoped request.
The sample audio is an instrumental timing guide, not a vocal recording.

## Workflow

Use this main workspace.
Keep native builds sequential.
Store specs in `docs/specs`, plans in `docs/plans`, and evidence in `docs/notes`.
Keep dependency versions pinned and regenerate Gradle lockfiles when dependencies change.
Change `iosApp/project.yml` before regenerating the Xcode project with XcodeGen.
Change `tools/generate_sample.py` before regenerating sample audio.
Do not commit generated build output or machine-specific SDK paths.

## Checks

- Shared behavior: `./gradlew :shared:jvmTest`
- Android: `./gradlew :androidApp:assembleDebug :androidApp:lintDebug`
- iOS framework: `./gradlew :shared:linkDebugFrameworkIosSimulatorArm64`
- iOS host: generate with `xcodegen generate --spec iosApp/project.yml`, then use the simulator build command in `README.md`.
- Native runtime: confirm playback, seeking, repeat, hiding lyrics, and background pause on a simulator or emulator.
