# Saved YouTube practice and lyric script labels

## Approved scope

Show writing systems from the displayed lyric body, including mixed scripts, without claiming language identification or transliteration.
Save up to 20 explicitly chosen video and LRCLIB record combinations with their timing offsets on this device.
Keep the approved timed-scrolling behavior.

## Behavior

- Analyze letters in synced lyrics when present, otherwise plain lyrics; exclude timestamps and LRC metadata.
- Show concise writing-system badges and a short text preview in candidates and script information for the selection.
- Group Kana and Han under Japanese when Kana is present; leave Han-only content labeled Han.
- Separate candidate title, artist/album details, badges, duration difference, and two-line preview; omit percentage noise and duplicate album/title text.
- Treat Latin letters as Latin, not as confirmed English or romanized Japanese.
- Save through an explicit button in lyric settings; repeated saves of the same video and lyric ID update the existing entry.
- Store only a versioned video ID, LRCLIB ID, display title, and offset in WebView local storage.
- Offer open and remove actions in a saved-practice list on discovery.
- Opening a saved entry cues the video without autoplay, fetches that exact LRCLIB ID, and applies the offset only after valid lyrics load.
- Preserve existing request size, timeout, cancellation, retry, and generation guards.
- Report storage errors and missing or malformed lyrics without claiming success or choosing another record.
- Do not silently evict entries when the limit is reached.

## Non-goals and follow-up

Automatic pronunciation and language identification are separate work; future conversion needs phrase-level language decisions for mixed-language lyrics and the user's target locale.
Lyric-row seeking remains deferred.
The later approved button-design pass separates playback movement and lyric timing with visible captions; see `2026-09-28-practice-controls.md`.
No backend, lyric-body persistence, progress sync, or dependency changes are included.

## Acceptance

1. Mixed Hangul/Latin and Kana/Han/Latin content yields script labels from actual displayed text, with no false language label.
2. A fresh page instance reads saved references and restores the exact lyric and signed offset after a network response.
3. Storage denial, corrupt data, missing records, stale responses, replacement videos, and full capacity cannot overwrite an unrelated selection or claim a successful save.
4. Existing shared page tests, JVM tests, Android build/lint, scoped Trunk checks, and iOS host build pass.
5. Browser reload verifies real storage; native relaunch persistence requires a separate platform observation.
