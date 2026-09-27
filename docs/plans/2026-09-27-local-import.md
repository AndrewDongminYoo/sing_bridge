# Local song import implementation

The operator selected local audio and LRC import.
Use the existing main workspace and keep changes uncommitted for review.

1. Add strict LRC parsing and transactional session ownership with failing behavior tests first → verify: `./gradlew :shared:jvmTest`.
2. Generalize the practice screen and add a two-step import dialog → verify: shared tests and native builds.
3. Connect Android document selection and iOS fileImporter, metadata validation, and resource cleanup → verify: `./gradlew :androidApp:assembleDebug :androidApp:lintDebug` followed by the README simulator build command.
4. Check import success, errors, cancellation, replacement, and existing practice controls on available native surfaces → verify: native observations recorded under `docs/notes`.
5. Review the diff and update supported formats and limitations → verify: `trunk check --no-fix` and `git diff --check`.

The operator subsequently approved restoring the last song after relaunch.
Extend the native hosts with private audio copies and a versioned atomic manifest, test storage failure before implementing its commit path, and verify force-stop/relaunch and sample reset.
No new dependencies, backend, automatic pronunciation, multi-song library, or physical-device writes are planned.
Project-scoped Oracle retrieval for local audio and LRC import returned no precedent.
