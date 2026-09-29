# SingBridge

## Project identity

- Project ID: `sing_bridge`
- Account: personal (`AndrewDongminYoo`)
- Product name: SingBridge
- Runtime: Kotlin Multiplatform with Compose Multiplatform for Android and iOS.

## Scope

Build an offline song-practice baseline with original demonstration content.
The approved YouTube screen uses a visible official player with artist-title YouTube search, LRCLIB search, explicit lyric selection, and timing adjustment; it does not replace the local AudioPlayer contract.
Read optional YOUTUBE_API_KEY only from ignored local.properties and generate its common configuration under shared/build.
Never print credentials or commit generated configuration.
The approved pronunciation prototype uses `server/` with a loopback-only Node server and native debug transports.
Read `OPENAI_API_KEY` or `OPEN_AI_API_KEY` only on the server; never generate these values into the app.
Keep direct links usable in builds without a search key.
Keep provider lyrics in screen memory unless the user explicitly saves a pronunciation layer with its source snapshot for local reuse.
Treat provider fields and user edits as text, and preserve request limits and cancellation.
LRCLIB access does not establish commercial lyric rights.
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
Trunk pre-commit formatting is enabled; stage with `git add` and commit the index, and review what the formatter rewrote before pushing.

## Checks

- Shared behavior: `./gradlew :shared:jvmTest`
- Shared YouTube page behavior: `node --test tools/test-youtube.mjs server/pronunciation.test.mjs` (Node 22 or later).
- LRCLIB coverage tool: `node --test tools/lyrics-coverage/coverage.test.mjs` (no network).
- Android: `./gradlew :androidApp:assembleDebug :androidApp:lintDebug`
- iOS framework: `./gradlew :shared:linkDebugFrameworkIosSimulatorArm64`
- iOS host: generate with `xcodegen generate --spec iosApp/project.yml`, then use the simulator build command in `README.md`.
- Native runtime: confirm playback, seeking, repeat, hiding lyrics, and background pause on a simulator or emulator.
- Automation: validate `.github/workflows/ci.yml` with actionlint through Trunk and `setup.sh` with `/bin/bash -n setup.sh` plus ShellCheck.
- Hosted setup: distinguish controlled fixture tests from real Linux installation and GitHub-hosted execution.
