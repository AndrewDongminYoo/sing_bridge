# Fewer lyric settings reopenings before the first sung line

## Status and authority

Draft for the operator's approval; merging it approves the behavior below, not the start of implementation.
Issue: #86, from the operator's feedback on the #24 runs on 2026-10-03.
The dialog rule in [song search](2026-09-28-song-search.md) ("Pause before opening it, block playback while it is open, and do not autoplay when it closes") is unchanged and applies to every opening below.

## Why

The operator named generating pronunciation as the slowest step and two dialog reopenings as explicit delays:

- After a song search, `openVideo` in `YouTubeEmbed.kt` opens the video and starts the LRCLIB search on its own, but the candidates appear only inside the closed lyric settings dialog, so the user has to tap **가사 선택** to see them.
- Choosing a lyric record runs `chooseLyrics` in `YouTubeLyrics.kt`, which closes the dialog, so the user has to open **가사·설정** again to tap **음차 만들기**.

Steps 3 and 4 of the manual protocol in [first-sing timing](../notes/2026-09-29-first-sing-timing.md) contain both reopenings.

## Behavior

### The dialog opens on its own after a song search

- When a song search opens a video, the dialog opens when the player reports ready and the lyric search starts, so the user sees the search progress and then the candidates without tapping **가사 선택**.
  It opens at that point, not when the candidates arrive, so that it never pauses playback the user started while the search was running.
- It opens the same way as the **가사 선택** button: playback pauses and the video details are filled in.
- It does not open when, by the time the player is ready, the user has started another search or opened another video, has left the practice screen with **다른 노래 찾기**, or the app is in the background or hidden.
- Opening a video from a direct link, a share code, or 저장한 연습, and returning to the previous video after a searched video fails to play, keep today's behavior: the dialog stays closed.
- If the lyric search fails or finds nothing, the dialog stays open with the status message and the search form, as it does today when the user opens it.

### The dialog stays open after a lyric record is chosen, when 음차 만들기 can be pressed

- After the user taps a lyric candidate, the dialog stays open when **음차 만들기** is enabled, or would be once a reading language is chosen, which is when all of these hold:
  - pronunciation is available in this build (the debug transports today);
  - the chosen record has timed lines with text;
  - the restored pronunciation layer, if any, does not already cover every line.
- The request limits (240 lines, 500 characters per line, 30,000 characters) are not part of this rule, because they do not disable the button today: lyrics over a limit keep the dialog open, and pressing **음차 만들기** reports 가사가 너무 길어요 next to it, as it does now after a reopening.
- The candidate list collapses as today and the pronunciation section scrolls into view. Focus moves to **음차 만들기** when a reading language is chosen; otherwise **읽을 언어** is scrolled into view without focus, so that no picker opens without a tap.
- Otherwise the dialog closes as today. This covers release builds and the physical iPhone, where pronunciation is unavailable, plain lyrics without timing, and a fully restored layer.
- Restoring a practice after a failed video, opening 저장한 연습, and opening a share code keep closing the dialog, because the user did not choose a candidate there.
- The user closes the dialog with **닫기** after tapping **음차 만들기**, as today; generation continues and its lines appear in the practice screen.

## Non-goals

- Generating pronunciation automatically when a record is chosen: it sends lyrics to a paid provider, and the user decides when.
- Closing the dialog when **음차 만들기** is tapped.
- Any change to batch size, batch order, or generation time, which remain the slowest step.
- Any change to direct links, share codes, saved practices, or the dialog layout.

## Acceptance

1. Page tests in `tools/test-youtube.mjs` fail first and then cover: the dialog opening after a song search with playback paused and video details filled in; no opening for a direct link, a share code, a saved practice, or the fallback to the previous video; no opening when the user left the practice screen, started another search, or the app went to the background before the player was ready; the dialog staying open after a candidate is chosen with pronunciation available, with focus on **음차 만들기**, or **읽을 언어** in view without focus; the dialog closing after a candidate is chosen without pronunciation, with plain lyrics, or with a complete restored layer; and the dialog closing for a restored or saved record.
2. Existing tests pass. Tests that choose a candidate and then assert the dialog is closed keep passing because the default fixture has pronunciation unavailable; any test changed on purpose is named in the implementation PR.
3. The README describes both openings where it describes **가사 선택** and **음차 만들기**.
4. On the iOS simulator Debug build and the Android emulator debug build, a song search opens the dialog without a tap, the keyboard does not appear, choosing a candidate leaves **음차 만들기** in view, and closing the dialog does not start playback.
5. A dated addendum to the #24 protocol notes that steps 2 to 4 no longer include reopening the dialog; the protocol's earlier text stays as the record of the earlier runs.
