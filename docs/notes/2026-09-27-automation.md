# Automation Setup

## Scope

The operator requested separate lower-model workers for CI, Trunk, and hosted container setup, each using an applicable skill.
Three Terra workers own `.github/workflows/`, `.trunk/`, and `setup.sh` respectively.
The root agent owns documentation and integration verification in the main workspace.
The initial setup task did not publish commits or trigger hosted CI.
The operator subsequently requested publication through `pr-loop`; PR checks and review results are recorded in that PR and Git-local loop state.

## Skills

- CI: `verify-in-deployment-interpreter` distinguishes runner execution from local syntax checks.
- Trunk: `setup-trunk` selects linters from repository evidence and verifies their execution.
- Container setup: `maintaining-hosted-container-setup` requires command checks, repeatable setup, and explicit execution limits.

## Precedent

Oracle retrieved account-neutral guidance for `CI` and `Trunk` under personal project `sing_bridge`.
The returned source revision was `c1681868ac634e4b2414874716bb75a7864113c4`; freshness against the current wiki is unverified.
The query returned a limited candidate set, so its absence of project-specific guidance is not exhaustive.

- `wiki/concepts/trunk-init-flow.md` confirmed initialization, action inspection, an initial full scan, and changed-file checks for routine use.
- `wiki/concepts/trunk-quality-gate-agent.md` confirmed real linter execution, negative controls, and no automatic formatting before reviewing its scope.
- `wiki/concepts/trunk-pre-commit-no-verify-prohibition.md` confirmed that hook failures must be diagnosed rather than bypassed.
- `wiki/concepts/trunk-stack-baselines.md` listed a broader historical bundle; the current installed skill's evidence-based selection takes precedence.

No applicable project-specific CI or hosted setup precedent was found in the returned candidates.

## Verification criteria

- CI: validate workflow syntax and declared shell commands; report hosted execution separately.
- Trunk: show that each enabled linter rejects a relevant temporary violation, then passes after fixture removal.
- Setup: check Bash syntax, ShellCheck, command-present and command-absent branches, and repeated execution.
- Integration: run the initial non-mutating Trunk baseline and inspect the complete working-tree diff.

## Hosted Linux setup results

The setup worker checked Bash syntax and ShellCheck, then exercised controlled fixtures for an existing SDK, missing `javac`, unsupported ARM64, and incomplete SDK directories.
The negative fixtures failed as expected.
Those checks do not establish installation behavior by themselves.

The root agent then created a disposable Ubuntu 24.04 x86_64 container on the local Docker engine and provisioned OpenJDK 21.
The base image was `ubuntu@sha256:008173c23f95b170204355c12626cb5a965d779a7e1283b09e9cffbb1bf33ca3` with the `linux/amd64` platform selection.
Running `/bin/bash /workspace/setup.sh` from `/tmp` installed Android SDK 36 and Build Tools 36.0.0 and exited successfully.
A second identical invocation exited successfully and reused the SDK without downloading it again.
The installed JDK reported `21.0.12.1`.

A later shell sourced `/workspace/.singbridge-env` and executed the installed tools.
`sdkmanager --version` reported `1.0.16406183 (Android CLI)`, `aapt2 version` reported `2.20-13193326`, and the platform's `android.jar` existed.
The current command-line tools print a deprecation notice for `sdkmanager` and delegate to Android CLI; the tested invocation still succeeded.
The disposable container was stopped and removed after verification.
These are real local Linux-container results, not Codex-hosted or GitHub-hosted execution results.

The pinned [Google command-line tools archive](https://dl.google.com/android/repository/commandlinetools-linux-16111833_latest.zip) was checked against the official SHA-1 in [Google's repository metadata](https://dl.google.com/android/repository/repository2-1.xml), then pinned by SHA-256 in `setup.sh`.
The SHA-256 is `0877a1d048fe4a24efe2eff536ca4223f7adeb58648bb81909d33c446918cfa8`.
The JDK range follows [Gradle 9.3.1's compatibility table](https://docs.gradle.org/9.3.1/userguide/compatibility.html).

## Advisory diagnostic

After the project instructions changed, `codex doctor --summary --ascii --no-color` reported 23 OK, 3 notes, 1 warning, and 0 failures.
The Trunk worker's later run reported 22 OK, 4 notes, 2 warnings, and 0 failures.
The latest warning labels were `threads` and `updates`.
These advisory diagnostics were not treated as application test results, and no unrelated environment changes were made.

## CI checks

The workflow contains Linux JVM and Android checks, an unsigned iOS simulator host build, and a separate Trunk job.
YAML parsing and the declared Bash blocks passed syntax checks under `/bin/bash --noprofile --norc`.
A deliberately malformed Bash block failed its syntax check.
An actionlint fixture with an invalid GitHub context failed with `property "not_a_real_property" is not defined`.
After fixture removal, actionlint checked the actual workflow and reported no issues.
These checks establish syntax and supported workflow structure, not successful execution on GitHub runners.

Runner labels were checked against [GitHub's hosted runner reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners).
The Xcode selection follows [Kotlin's compatibility guide](https://kotlinlang.org/docs/multiplatform/multiplatform-compatibility-guide.html), which lists Xcode 26.0 for Kotlin 2.3.20.
XcodeGen uses the checksum-verified [2.46.0 release](https://github.com/yonaskolb/XcodeGen/releases/tag/2.46.0).
External action commits were checked against their official release tags and pinned by full SHA.

## Trunk checks

The configuration pins Trunk 1.25.0, plugin v1.11.0, Node 22.16.0, actionlint 1.7.12, markdownlint 0.45.0, and ShellCheck 0.11.0.
Initial attempts with implicit system tools did not execute all linters; explicit managed versions and the Node runtime resolved that issue.
Those initial attempts were not counted as successful checks.

Markdownlint rejected an MD040 fixture, while a long prose line passed with MD013 intentionally disabled.
ShellCheck rejected SC2086 and SC2154 fixtures, then passed the real `setup.sh`.
The CI worker separately proved actionlint's failure and clean paths.
All temporary negative fixtures were removed.

The initial `trunk check --all --no-fix --no-progress` run exited successfully with 8 applicable files checked and no issues.
This scans workflow, owned shell, and Markdown content; it does not compile Kotlin or exercise native audio behavior.
The non-mutating `trunk-check-pre-push` action is enabled, and Git's local `core.hooksPath` points to Trunk's managed hooks.
Automatic pre-commit formatting remains disabled.

## Integration status

Implementation and local verification are complete.
The initial setup ended with the automation configuration and documentation uncommitted.
No GitHub-hosted execution was included in the initial local verification results above.
