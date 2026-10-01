# One practice save verification

<!-- cspell:words aimyon -->

Spec: [one practice save](../specs/2026-10-01-single-practice-save.md).
Issue: #76.

## Automated checks

- The new page tests failed first: 7 of 9 failed against `main` (the two that guard a saved offset from a shared or searched practice and from a deleted entry passed, as they assert behavior that already held), then all passed with the change.
- Tests written against the old contract were updated and are listed in the PR: clicks on the removed **음차 저장** became **이 연습 저장**, and the tests that asserted the old hint, the reference-only save, and the timing save that waited for a button now assert the new behavior.
- `node --test tools/test-youtube.mjs server/pronunciation.test.mjs`: 172 tests pass.
- `./gradlew :androidApp:assembleDebug :shared:jvmTest` passed.

## Emulator check

Pixel_10 emulator, this branch's debug APK installed over the app with `adb install -r`, using a practice saved during the #24 runs (aimyon - マリーゴールド, LRCLIB 11839819, offset 0 s).

1. Opened it from 저장한 연습; its pronunciation layer was restored.
2. Expanded **가사 싱크 조절** and pressed **0.5초 늦게**: the offset read 0.5초 늦게 and the status line read 싱크를 저장했어요., without opening lyric settings.
3. Pressed **곡 찾기**: the 저장한 연습 row read `· 0.5초`.
4. Stopped the app with `am force-stop`, started it again, and opened the same row: the practice opened with 0.5초 늦게.
5. Pressed **초기화** to put the offset back to 0 s; on this short screen, where the sync caption is hidden, the status line 싱크를 저장했어요. stayed visible.

## What happened during the check

- Right after the restart in step 4, the first launch showed 아직 저장한 연습이 없어요. while the WebView's Local Storage LevelDB log recorded a clean recovery (`Recovering log #50`, `table #52: 22746 bytes OK`) in the same second.
  The Mac then restarted for an unrelated reason, and the next launch listed every saved practice, with the row at `· 0.5초`, so no data was lost.
  The cause of the empty first list was not found; it was seen once, directly after `am force-stop`, and no write happened before the list was read again.
- After the Mac restart the emulator's display read `Override size: 1080x1920` and `Override density: 480` (this session did not set them), so tap coordinates from the recipe at 1080x2424 missed once and switched to the 연습 tab; nothing was written.

## Not checked

- iOS, which runs the same page script.
- Restoring a practice after a failed new search (`pendingRecovery`): it does not keep automatic timing saves, and 변경 내용 저장 stays available instead.
