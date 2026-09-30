# Practice sharing by code

## Status and authority

Draft for the operator's approval; merging it approves the behavior and its non-goals, not the start of implementation.
On 2026-09-30 the operator asked whether a practice that someone aligned (video, lyrics, pronunciation, sync) can be seen by others, and chose to share it as a code in a text message, opened by the recipient, with saving left to the recipient.

## Why

Saved practices live only in the app's WebView `localStorage` under `singbridge.practice.v1` ([saved practice](2026-09-28-saved-practice.md)), so a person who has picked the right lyric record and adjusted its timing cannot pass that work to anyone.
The recipient has to search the video, choose among up to 20 LRCLIB candidates, and adjust the offset again.

## What is shared

Only the saved-practice reference: the YouTube video ID, the LRCLIB lyric ID, and the timing offset.

- No lyric text, pronunciation layer, or line edit is shared; the [product research](../notes/2026-09-27-product-risks.md#rights-boundaries) notes that user-to-user sharing adds uses that need separate review, and #17 has not answered the rights question.
- The recipient's app fetches the lyrics from LRCLIB by ID and can generate its own pronunciation, as it does for any practice.

## Sending

- Lyric settings get a share button, proposed label **이 연습 공유**, next to **이 연습 저장**.
  It is enabled when a video is open and a lyric record is selected, and shares the current offset, saved or not.
- The page builds the message and hands it to a new share bridge, which opens the operating system's share sheet: `UIActivityViewController` on iOS through a `WKScriptMessageHandler` named `share`, and an `Intent.ACTION_SEND` chooser with `text/plain` on Android through a `WebMessagePort`, following the pattern of `PronunciationBridge.kt` and `PronunciationBridge.swift`.
- The app targets iPhone and iPad (`TARGETED_DEVICE_FAMILY: 1,2` in `iosApp/project.yml`), and on iPad a `UIActivityViewController` must be presented as a popover, so the iOS bridge sets its `popoverPresentationController` `sourceView` and `sourceRect` to the web view before presenting it.
- Unlike the pronunciation bridge, the share bridge is registered in every build, because sharing needs no development server.
- The bridge accepts messages only from the app's own page, as `PronunciationBridge.swift` and `PronunciationBridge.kt` already do: on iOS it rejects a message unless `frameInfo.isMainFrame` is true and the security origin is `https` with the app's bundle identifier as host, so the embedded YouTube player or any other frame cannot open the share sheet; on Android the message port is posted only to the app origin.
- It accepts only a string of at most 2,000 characters and passes it to the share sheet unchanged; it never reads storage or makes network calls.
- When the bridge is missing, the button stays hidden.
- Wire contract, owned by the page since #65: on iOS the page posts the message string to `window.webkit.messageHandlers.share`; on Android the host calls `window.singBridgePrepareSharePort(nonce)` and then posts `nonce` with one `MessagePort` to the app origin, and the page posts the message string to that port.
  The page shows the button when either path exists, checking again whenever its controls update, so a port that arrives after load shows it; it caps the title at 500 code points so the message stays within 2,000 characters.

## Message

Three lines:

1. The code: `singbridge:1:<videoId>:<lyricId>:<offset>`.
2. A line for people, proposed wording: `SingBridge 연습: <title>`, where the title is the selected record's `artistName - trackName`, as the save button stores it.
   The title comes from LRCLIB, so before building the line the page replaces control characters, format characters such as bidirectional overrides and isolates, and line or paragraph separators (`\p{Cc}`, `\p{Cf}`, `\p{Zl}`, `\p{Zp}`) with spaces (#64), replaces every `:` with a space, and collapses runs of whitespace; since a code needs colons, provider text can then neither add a line nor form a second code, however it is built.
3. `https://youtu.be/<videoId>`, so a recipient without the app can still open the video.

In the code, `1` is the format version, `videoId` is 11 characters of `[A-Za-z0-9_-]`, `lyricId` is a positive decimal integer within JavaScript's safe range, and `offset` is a signed integer in milliseconds, from `-600000` to `600000`.
For example, an offset of 1.25 seconds is written `1250`.
The offset control steps by 0.1 second, but typed values and saved entries accept any finite offset within ±600 seconds, so the sender rounds to the nearest millisecond; offsets with up to three decimal places survive unchanged, and any other offset changes by less than half a millisecond.

## Receiving

- The recipient pastes the whole message into the link input of the **노래 찾기** screen (`#video-url`, which already accepts up to 2,048 characters), where people paste YouTube links today.
- On submit, the page looks for the code pattern anywhere in the input, because messengers and inputs may join the lines.
  It opens a code only when exactly one distinct code is present and every field passes its rule; input with two different codes, or with a code that fails a rule, gets the invalid-code message, and the rest of the text is ignored.
- A valid code opens through the same path as a saved entry: cue the video without autoplay, fetch exactly that LRCLIB ID, and apply the offset only after valid lyrics load.
  The display title comes from the fetched record, never from the message, so pasted text cannot set what the app shows or saves.
- Nothing is saved automatically; the existing **이 연습 저장** button saves it, with the 20-entry limit and duplicate rules unchanged.
- Input without a code keeps today's behavior: a YouTube link or an 11-character ID opens the video, anything else shows the existing error.

## Strings

All in 해요체 like the rest of the page; the wording is a proposal for review during implementation.

| Situation                                   | Proposed text                                                     |
| ------------------------------------------- | ----------------------------------------------------------------- |
| Share button                                | 이 연습 공유                                                      |
| Title line                                  | `SingBridge 연습: <title>`                                        |
| Code present but invalid                    | 공유 코드를 읽지 못했어요. 받은 메시지를 그대로 붙여 넣어 주세요. |
| Shared lyric record missing                 | 공유받은 가사를 찾을 수 없어요. 다른 가사를 선택해 주세요.        |
| Shared lyric response invalid               | 공유받은 가사 응답이 올바르지 않아요. 다른 가사를 선택해 주세요.  |
| Shared practice opened                      | 공유받은 연습을 열었어요. 저장하려면 이 연습 저장을 눌러 주세요.  |
| Link input guidance (placeholder or helper) | YouTube 링크, 영상 ID, 받은 공유 메시지를 붙여 넣을 수 있어요.    |

Other failures (network, timeout, rate limit) reuse the existing lyric messages.

## Non-goals

- Sharing lyric text, pronunciation layers, edits, or practice history.
- Accounts, a backend, a hosted link, universal links, app links, or a custom URL scheme.
- Opening a shared code from outside the app (a tap in a messenger); the recipient pastes it.
- Changing the saved-practice format, its limits, or the pronunciation bridge.

## Acceptance

1. Page tests in `tools/test-youtube.mjs` cover: a valid code opens the video, fetches that lyric ID, and applies the offset after lyrics load; a code inside joined or multi-line text is found; each invalid field (ID length and characters, zero or unsafe lyric ID, offset outside ±600000, unknown version) and input with two different codes are rejected without a network request; an offset such as 1.25 seconds survives the round trip; a plain YouTube link still opens as before; nothing is saved until the save button is pressed; a stale lyric response from an earlier open cannot apply its offset.
2. The share bridge ignores a message from a frame other than the main page or from another origin, and the share button builds the three-line message with the current offset, flattens the title to one line without colons, so even a title that nests one code marker inside another yields no code, and is hidden without the bridge.
3. On an iPhone simulator, an iPad simulator, and an Android emulator, the share sheet opens with the message (on iPad as an anchored popover), and pasting that message on the other platform opens the same video, record, and offset; the check is recorded in a dated note.
4. Existing page, server, and JVM tests, Android build and lint, the iOS host build, and scoped Trunk checks pass.
