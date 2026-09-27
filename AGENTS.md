# SingBridge

## Project identity

- Project ID: `sing_bridge`
- Account: personal (`AndrewDongminYoo`)
- Product name: SingBridge
- Runtime: Kotlin Multiplatform with Compose Multiplatform for Android and iOS.

## Scope

Build an offline song-practice baseline with original demonstration content.
The approved YouTube spike is a separate visible official player screen; it does not supply lyrics or replace the local AudioPlayer contract.
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
For hosted Linux x86_64 containers, run `bash ./setup.sh` and source `.singbridge-env` before invoking Gradle in a later shell.
Keep `.singbridge-env` and `.android-sdk/` out of Git.
Use `trunk check --no-fix` for routine quality checks.
Keep automatic pre-commit formatting disabled unless its scope has been reviewed and accepted.

## Checks

- Shared behavior: `./gradlew :shared:jvmTest`
- Shared YouTube page behavior: `node --test tools/test-youtube.mjs` (Node 22 or later).
- Android: `./gradlew :androidApp:assembleDebug :androidApp:lintDebug`
- iOS framework: `./gradlew :shared:linkDebugFrameworkIosSimulatorArm64`
- iOS host: generate with `xcodegen generate --spec iosApp/project.yml`, then use the simulator build command in `README.md`.
- Native runtime: confirm playback, seeking, repeat, hiding lyrics, and background pause on a simulator or emulator.
- Automation: validate `.github/workflows/ci.yml` with actionlint through Trunk and `setup.sh` with `/bin/bash -n setup.sh` plus ShellCheck.
- Hosted setup: distinguish controlled fixture tests from real Linux installation and GitHub-hosted execution.
