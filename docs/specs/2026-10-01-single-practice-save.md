# One practice save, and timing kept without reopening settings

## Status and authority

Draft for the operator's approval; merging it approves the behavior below, not the start of implementation.
Issue: #76, from the operator's feedback after the #24 Android runs on 2026-10-01.
Once implemented, this spec replaces the save rules in [saved practice](2026-09-28-saved-practice.md) ("Save through an explicit button in lyric settings") and in [pronunciation editing](2026-09-28-pronunciation-editing.md) ("Only the pronunciation save action persists a new layer or edits; ordinary practice saving preserves existing saved layers while updating reference metadata and timing").

## Why

- Lyric settings have two save buttons: **이 연습 저장** saves the video, the lyric record, and the offset, and **음차 저장** saves the same practice plus the pronunciation layer and line edits for the current target (`saveCurrentPractice(true)` in `YouTubeLibrary.kt`). To the user they look like the same action twice.
- The timing buttons (**0.5초 일찍**, **0.5초 늦게**, **초기화**) sit in the practice screen footer under **가사 싱크 조절**, but the only save is inside the lyric settings dialog, so keeping a new offset takes opening settings again and pressing **이 연습 저장**.

## Behavior

### One save action

- Lyric settings keep one button, **이 연습 저장**, with its current labels: 이 연습 저장 for a practice not in the library, 변경 내용 저장 for a saved practice with changes, and 저장됨 when nothing differs.
- **음차 저장** is removed.
- Pressing it saves the reference (video ID, lyric ID, title, offset) as today, and also the pronunciation layer and line edits for the current target when a generated layer exists and every edit is valid.
- "Nothing differs" now covers the offset and the current target's layer and edits, so a generated or edited pronunciation enables 변경 내용 저장.
- Layers saved for the other target are kept, as today.
- When a generated layer has an invalid edit, the save keeps the reference and offset and any layer already stored, and the status says the pronunciation was not saved because of the edit; it does not report success for the pronunciation.
- The status line names what was saved: the practice alone, or the practice with its pronunciation. The hint "만든 음차는 음차 저장을 눌러야 저장돼요" goes away.

### Timing on a saved practice

- When the open video and lyric record are already in the library, every offset change from **0.5초 일찍**, **0.5초 늦게**, **초기화**, or **시간 직접 입력** writes the new offset to that entry at once.
- The automatic write changes only the offset: it never adds an entry, never writes a pronunciation layer or edit, and never changes the title.
- A status line inside **가사 싱크 조절** reports the result, proposed wording 싱크를 저장했어요 and, on a storage error, 싱크를 저장하지 못했어요. 가사·설정에서 다시 저장해 주세요.; the offset stays applied on screen either way.
- A practice that is not in the library, including one opened from a share code, is never saved automatically; its offset is saved by **이 연습 저장** as today.

### Limits and existing rules

- The 20-entry limit is unchanged and is reached only through **이 연습 저장**, since the automatic write never adds an entry.
- Duplicates are unchanged: the video ID and lyric ID pair identifies an entry, and saving it again updates it in place.
- There are no unsaved-change prompts today, and none are added: unsaved pronunciation edits are still discarded when leaving the practice or changing the lyric record or target.
- Storage failures keep the previous data, as today.

## Non-goals

- Saving a new practice automatically when its timing changes.
- Saving pronunciation layers or edits automatically.
- Any change to sharing, the saved-practice list, or the storage format (`singbridge.practice.v1`).

## Acceptance

1. Page tests in `tools/test-youtube.mjs` fail first and then cover: one button saving the reference with and without a generated layer, an invalid edit saving the reference but not the layer, the other target's layer preserved, the label states including a pronunciation-only change, an offset change on a saved practice written without opening settings, no automatic write for an unsaved or shared practice, the automatic write never adding an entry or a layer, and a storage error on the automatic write.
2. Existing saved-practice, pronunciation, and sharing tests pass, updated only where they press **음차 저장**.
3. The README and the two older specs point to this spec for the save rules.
4. A simulator or emulator check confirms a timing change on a saved practice survives reopening it from 저장한 연습 without opening lyric settings.
