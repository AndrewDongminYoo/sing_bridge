# Pronunciation reference verification

## Checks and what they read

`npm ci --ignore-scripts --prefix tools/pronunciation-quality` installed the locked dependency graph.
`npm audit --prefix tools/pronunciation-quality --json` reported zero known vulnerabilities at the time of inspection; this is advisory-database evidence, not a security guarantee.
The resolved graph is kuromoji 0.1.2, async 2.6.4, lodash 4.18.1, doublearray 0.0.2, and zlibjs 0.3.1.
The installed Apache-2.0 license and separate NAIST/ICOT IPADIC notices were inspected.

TDD initially produced seven failed reference-behavior tests and one pass against an inert adapter, then five failed CLI tests against an empty report.
Additional boundary tests failed for omitted model readings and prolonged-sound marks without kana before those cases were fixed.
`npm test --prefix tools/pronunciation-quality` now passes 14 tests using the real local dictionary and spawned CLI processes.
The deliberately wrong expected outcome exits 1 with `Baseline mismatch: match`, establishing that the baseline gate reads comparison behavior rather than fixture shape alone.
`node --test tools/test-youtube.mjs server/pronunciation.test.mjs` passes all 94 existing shared-page and server tests.
`JAVA_HOME='/Applications/Android Studio.app/Contents/jbr/Contents/Home' ./gradlew :shared:jvmTest` passed after the additional Kotlin HTML edit.
No paid inference or provider lyric requests were made.

## Measured sample

One local run of `node tools/pronunciation-quality/evaluate.mjs --check` loaded the dictionary in approximately 126 ms.
Per-case processing ranged from approximately 0.002 ms to 1.05 ms in that run.
These are single-run local observations, not mobile performance measurements or service latency guarantees.
`du -sk` reported 50,468 KiB for the installed dependency tree and 17,408 KiB for the dictionary directory.
These figures describe local disk allocation, not heap usage or app download size.

The 12 original/synthetic cases produced three reference matches, four deliberate differences, and five unassessable cases.
Seven of the twelve cases were comparable; three of those seven matched a dictionary candidate.
These ratios describe the intentionally mixed test corpus and must not be presented as AI accuracy.
Particles demonstrate why both lexical reading and pronunciation are retained: the dictionary distinguishes ハ/ワ and ヘ/エ in the supplied sentence.
Unknown kanji, romanized Japanese, mixed scripts, Korean phrases, and absent readings remain outside comparison coverage.
No evidence in this experiment establishes the quality of final Hangul transliteration or resolves a song-specific alternate reading.

## Product decision

Retain this as a developer diagnostic before considering runtime enforcement.
A difference merits human inspection; treating it as automatic rejection would conflate a single dictionary path with the sung reading.
The next decision should use real, authorized model-reading samples and reviewer judgments about false alarms.
Personal project Oracle returned `[no precedent found]`; the bounded experiment and current code are the decision evidence.

## UI adjustment

Repeated AI/language text was removed from generated lyric rows at the operator's request.
Language remains in phrase metadata and accessibility labels; uncertain phrases retain their underline.
Settings explain AI processing and the meaning of underlines, and explicit user edits still show their edited marker.

A rendered Chromium fixture loaded the current shipped HTML with a controlled player and synthetic pronunciation results.
A negative assertion expecting the old row label failed; the positive check confirmed that repeated labels were absent, an uncertain phrase still had its underline, and the accessible phrase label retained the language.
The 402-by-874 capture is `build/qa/pronunciation-clean-labels.png` (ignored local evidence).
This checks rendered DOM behavior, not native iOS playback or actual AI output.
The browser session and local fixture server were closed after the check.
Scoped Trunk checks passed for the Kotlin UI file, CI workflow, and documentation.
