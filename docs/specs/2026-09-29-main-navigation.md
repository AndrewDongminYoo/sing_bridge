# Main navigation

## Scope

Group the existing home practice, YouTube, and local import flows under persistent bottom tabs labeled 홈, YouTube, and 내 노래.
Home remains the current local/sample practice screen, not a new dashboard.
My Songs shows the existing single-song import flow and saved-song summary; it does not introduce a multi-song audio library.
Successful explicit imports return to Home without autoplay.

## State and playback

Retain each host's tab content for its lifetime so switching tabs preserves practice selection, YouTube search/player/lyrics state, and pending local imports.
Tab selection and application foreground state are independent conditions.
Local practice is enabled only when Home is selected and the app is foregrounded.
Leaving YouTube pauses and suspends its player; returning enables interaction but never resumes playback automatically.
File-picker cancellation preserves the selected import draft.
Android Back returns to Home from another tab before exiting the root activity.

## Acceptance

- All three destinations are reachable through labeled native bottom navigation.
- Hidden local or YouTube content cannot continue playing when the app regains focus.
- Home, YouTube, and import controls remain above the tab bar and keyboard.
- Existing search, lyric selection, timing, saved pronunciation, and local import contracts remain unchanged.
- Verify shared visibility behavior with TDD, both native builds, and iOS 27.0 tab interaction and screenshots.
- Operator visual approval is required before merge.
