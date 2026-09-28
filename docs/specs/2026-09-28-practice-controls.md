# Practice control design contract

## Direction

Preserve the approved mobile practice screen and its cream/forest-green palette while making button roles readable.
The audience is a listener practicing foreign-language songs on a small phone.
The user invoked a design skill after approving lyric cards and discussing button styling.
The supplied marketing-page skill excludes product UI, so this bounded redesign uses frontend-design with the existing native HTML/CSS surface.

## Audit

Default platform button styling gives search, save, navigation, and timing actions almost equal weight.
Adjacent playback seeking and lyric timing actions need visible group names.
The current practice grid and candidate cards already have explicit approval and remain the starting point.

## Contract

- Keep the same screen routes, button IDs, handlers, text labels, data storage, playback behavior, official player, and candidate cards.
- Use a shared 10-pixel control radius, 44-pixel minimum touch height, existing system font, and scoped CSS color tokens.
- Make search, open, and save actions solid green; use outlined secondary navigation and subtly tinted playback-seek controls.
- Add compact visible captions for playback movement and lyric sync, aligned beside each existing button row.
- Preserve the fixed viewport grid, with no new practice-page scrolling at 320×568 or 393×700; preserve the existing landscape arrangement at 852×393.
- Keep inputs legible and aligned with buttons; leave the native host navigation bar unchanged.
- Show enabled, disabled, pressed, and keyboard-focus states without a new motion effect.
- Reuse the current light theme and reduced-motion scrolling behavior; do not introduce a new theme, font, icon library, decorative asset, or dependency in this bounded pass.

## Verification

1. Existing `node --test tools/test-youtube.mjs` verifies that control handlers retain their behavior.
2. Render discovery, practice, and lyric settings in an isolated browser at the specified sizes; inspect role hierarchy, group captions, clipping, focus, and touch heights.
3. Check shared Kotlin compilation/tests, scoped Trunk, and the iOS host build sequentially.
4. Install over the existing DeviceHub app for operator visual review.
