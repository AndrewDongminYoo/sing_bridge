# Lyric tap playback proposal

## Status

Approved next scope after merged PR #9.
The operator selected this proposal with "해당 범위로 먼저 진행합시다."
Implementation continues under the existing PR workflow authority.
Personal-project Oracle returned `[no precedent found]` for lyric seeking and pronunciation quality.

## Behavior

Explicitly activating a timed, nonempty lyric row seeks to its timestamp plus the current signed lyric offset and starts playback.
Ordinary reading, scrolling, dragging, and pointer cancellation must never seek or start playback.
Original text and pronunciation in the same row share the same target timestamp.
Preserve the source lyrics, pronunciation edits, saved practice, and timing offset.
Require a ready, visible, foreground player and valid video duration.
Clamp negative target times to zero; reject targets at or beyond the end rather than unexpectedly starting the repeat loop.
Return lyric following to the actual reported playback position after a successful command; do not assume that remote seek completes immediately.
Expose equivalent keyboard activation and visible focus without adding controls to the fixed footer.
Plain lyrics and blank timing markers remain noninteractive.

## Owned files

- `shared/src/commonMain/kotlin/io/github/andrewdongminyoo/singbridge/YouTubeLyrics.kt`: row activation, gesture discrimination, timestamp mapping, and follow state.
- `shared/src/commonMain/kotlin/io/github/andrewdongminyoo/singbridge/YouTubeEmbed.kt`: existing lyric-row focus and interaction styling only.
- `tools/test-youtube.mjs`: shipped-script regressions with a controlled player.
- `README.md` and a scoped verification note: behavior and measured limits.

## Acceptance sequence

1. Add failing regressions for ordinary activation, positive and negative offsets, end boundaries, blank/plain rows, hidden or unready playback, scroll/drag cancellation, and keyboard activation.
2. Implement the smallest change without new dependencies or changes to the local AudioPlayer contract.
3. Run `node --test tools/test-youtube.mjs server/pronunciation.test.mjs`, `./gradlew :shared:jvmTest`, and scoped `trunk check --no-fix`.
4. Use a rendered browser fixture to verify the actual gesture behavior and focus appearance; VM fixtures alone do not prove pointer propagation or native scrolling behavior.
5. Verify the assigned iOS 27.0 simulator when the Mac is available; otherwise preserve the native-verification gap without claiming a pass.
6. Complete local review, then publish under the continuing PR workflow and verify both code and security review on the new head.

## Risks

The main regression risks are a scroll gesture being interpreted as a tap and applying the timing offset with the wrong sign.
Current pronunciation rendering replaces row contents, so handlers and focus semantics must survive that rendering path.
The existing automatic-scroll requirement remains in force: only explicit activation may seek.
