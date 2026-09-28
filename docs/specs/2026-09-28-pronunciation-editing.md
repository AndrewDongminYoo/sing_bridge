# Saved pronunciation and line editing

## Approved scope

The operator approved device-local saving, editing, and reuse of generated pronunciation.
LRC file import or export, translations, and an OSS quality gate are outside this increment.
An OSS engine remains a future candidate for checking AI output, not merely replacing AI calls.
This decision supersedes the memory-only persistence constraint in the initial pronunciation prototype specification.
Oracle returned [no precedent found] for this scoped personal-project query.

## Contract

- A user explicitly saves the video, lyric selection, signed offset, generated segments, target language, source snapshot, and per-line text overrides.
- Existing reference-only library entries remain readable without migration.
- Korean and English layers are independent; edits do not modify generated segments, original source text, or timestamps.
- Restoring fetches the exact LRCLIB record and compares source text and timestamps before applying a saved layer.
- A saved result requires no new AI request, including when the native AI transport is unavailable.
- Editing addresses an existing generated line ID only.
- Blank text, line breaks, Unicode control or format characters, and oversized edits cannot be saved or rendered as replacement pronunciation.
- The editor permits up to 2,000 characters per line and 30,000 edited characters overall.
- Resetting an edit restores the generated line; persisting the reset requires another explicit save.
- Invalid stored mappings, source mismatches within generated segments, duplicate IDs, and unsupported versions or targets fail closed without overwriting storage.
- Storage writes are bounded and atomic at the existing localStorage item boundary; quota errors retain previous data and leave current edits available to retry.
- Unsaved edits are discarded when leaving the screen or changing the selected source or target.

## Verification

The shipped JavaScript is executed in fresh Node VM page fixtures backed by shared storage.
Tests must first fail on missing persistence and invalid-edit handling, then pass after implementation.
Native verification uses only the assigned iPhone 17 Pro with iOS 27.0 and checks save, edit, reopen, and playback timing.
