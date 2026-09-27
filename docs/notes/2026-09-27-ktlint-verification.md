# Kotlin lint verification

## Scope and configuration

The separate adoption PR adds ktlint 1.7.1 and managed Java 23.0.1 to Trunk 1.25.0 with plugin v1.11.0.
The plugin formatter alone did not report a non-fixable function naming violation.
The added SARIF command catches that violation; `--relative` makes file paths match Trunk targets and `--log-level=none` prevents warnings from preceding the JSON report.
Both commands invoke Java directly because the executable launcher requires `sed`, which is absent from the managed runtime PATH.
Compose function names and existing trailing commas remain supported.
One function-scoped suppression preserves the exported iOS `MainViewController` name.

## Evidence

- Before the SARIF command, `fun Bad_name() = Unit` passed the formatter-only gate.
- With the final configuration, the same temporary fixture failed with `ktlint/standard:function-naming` and exit 1.
- Renaming it to `goodName` passed with exit 0; the temporary file was removed.
- The initial explicit 18-file scan reported 8 unformatted files.
- After scoped formatting, `trunk check --all --no-fix --filter=ktlint` checked all 18 tracked Kotlin files and passed.
- `./gradlew :shared:jvmTest` passed all 21 shared tests after formatting.
- `git diff --check` passed.

The lint fixture proves diagnostic execution, not application correctness.
Shared tests inspect parsing and controlled playback/resource behavior, not native audio decoding or rendered UI.
Existing GitHub Actions native jobs will validate compilation on Linux and macOS.
No application dependency manifest values or lockfiles changed.
Automatic pre-commit formatting remains disabled.
