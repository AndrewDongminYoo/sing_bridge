# Pronunciation editing verification

## Scope and authority

The operator approved saving, editing, and reusing pronunciation inside the app and explicitly excluded LRC export for this increment.
The operator requested TDD coverage against destructive edits, line breaks, and abnormal engine behavior.
Personal account: AndrewDongminYoo; project: sing_bridge.
Oracle returned [no precedent found] for pronunciation persistence and lyric editing.

## Automated evidence

- Initial new persistence tests: three failures because saving and editing handlers did not exist.
- Invalid-edit tests: two failures before repair, demonstrating that invalid text reached the layer and tampered stored line breaks were accepted.
- `node --test tools/test-youtube.mjs server/pronunciation.test.mjs`: 88 passed, zero failed.
- These tests execute shipped JavaScript in fresh VM contexts and shared storage, checking source identity, timing, independent language layers, edit restoration, quota preservation, malformed storage, and literal timestamp-like or HTML-like text.
- `JAVA_HOME='/Applications/Android Studio.app/Contents/jbr/Contents/Home' ./gradlew :shared:jvmTest`: passed.
- Scoped `trunk check --no-fix`: eight applicable files checked, no issues; `.mjs` behavior is covered by Node tests rather than this lint result.
- iOS Debug host build for simulator `3AA6657C-B611-4A12-A3A9-6A56CDCF2F64`: BUILD SUCCEEDED.
- Two independent read-only reviews found no reproducible blockers in persistence validation or interaction behavior.

## Native evidence

Installed over the existing app on iPhone 17 Pro with iOS 27.0.
Opened the existing Odoriko practice with LRCLIB record 35923881 and a 5.5-second delay, generated Korean pronunciation, and saved it through the app.
Terminated and relaunched the app, reopened the saved practice, and observed Korean pronunciation and the same delay without tapping generation again.
The settings status explicitly reported that saved pronunciation was restored.
Screenshots are in ignored `build/qa/pronunciation-storage-editor.png`, `build/qa/pronunciation-storage-restored.png`, and `build/qa/pronunciation-storage-restored-status.png`.
Automated HID typing and simulator clipboard input did not reach the native editor reliably, so native keyboard editing is not claimed as verified.
The installed Debug build remains available for operator testing.

## Rendered browser evidence

Used the shipped HTML and JavaScript with synthetic two-line provider, player, and pronunciation transport fixtures in an isolated browser session.
The player area is a fixture, not a real video.
Entered a multiline edit through the real textarea: both save actions became disabled, the displayed pronunciation remained the generated text, and original timestamps stayed at 2 and 5 seconds.
Entered a valid edited pronunciation, saved, reloaded the page, and reopened the saved practice: the edited line was restored and the mock AI call count remained zero.
Inspected `build/qa/pronunciation-edit-browser-invalid.png` and `build/qa/pronunciation-edit-browser-restored.png`.
Closed the browser session and stopped the temporary fixture server.

## Limits and next action

Hosted code review identified that ordinary practice saving also persisted unsaved pronunciation.
A new regression failed on the unexpected stored layer before the fix; ordinary saving now updates references and timing while only the pronunciation save action persists drafts.
The regression also checks that an offset save preserves previous pronunciation and remains available when a pronunciation draft is invalid.
The complete Node suite passed 89 tests after this repair.

Native keyboard editing remains unverified: the earlier automated input did not reach the editor, and a later Device Hub retry was blocked by the locked Mac before input could be tested.
The operator deferred that check while working remotely; this is not evidence that Device Hub cannot type or paste.
No physical device was used.
No Android native pass was performed for this change.
PR #8 is merged; this increment continues on `codex/saved-pronunciation` from `40362bd`.
The Node suite was rerun on that branch with 88 passes and no failures.
Hosted checks and code/security review must cover the new PR head.
Operator review of the editor UI remains pending before merge.
