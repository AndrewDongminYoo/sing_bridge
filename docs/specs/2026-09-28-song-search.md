# Song search across YouTube and LRCLIB

## Approved experience

The operator requested a song-search input that accepts artist - title, opens the most relevant YouTube video, and then searches LRCLIB with the same artist and title.
Keep the existing direct YouTube link/ID input and manual lyric search available.
Video discovery does not authorize audio extraction or bypassing the official visible player.

## Search contract

Use an explicit search action, not a request on every keystroke.
Parse the first spaced hyphen delimiter so names such as G-Dragon remain intact.
Require both artist and title, trim surrounding whitespace, and bound input length.
Send the combined artist/title terms to the official YouTube Data API search.list endpoint with part=snippet, type=video, order=relevance, videoEmbeddable=true, videoSyndicated=true, and maxResults=1.
Since #70 the search asks for up to five candidates and reads their age ratings with one videos.list call (part=contentDetails), because the embedded player refuses `ytAgeRestricted` videos and no search filter excludes them; the first candidate not rated `ytAgeRestricted` is opened, all-restricted results show the empty-result state, and a failed rating lookup keeps the first candidate.
Treat the result as the highest-ranked candidate, not proof of the correct recording.
Display the chosen video title and channel, and preserve the direct-link fallback.
Keep autoplay disabled; the user starts playback in the official player.

When the selected player is ready, issue one LRCLIB search using the original artist and title.
Keep explicit lyric-result selection because versions and timings can differ.
Do not use the YouTube upload title as an automatic replacement for the user's artist/title.
Empty video results, unavailable credentials, quota errors, network failures, and player errors need distinct recoverable states.
A failed search must preserve the currently usable video.
If a searched candidate fails before playback starts, restore the previous usable video, selected lyrics, and timing adjustment without autoplay.
A new search or direct-link submission invalidates earlier pending search results and lyric handoffs.
Preserve the existing lyric timeout, size bounds, cancellation, and rate-limit handling.

## Credential integration

The operator supplied YOUTUBE_API_KEY through ignored local.properties.
An official search probe returned HTTP 200 and the top Vaundy video without printing credentials.
Generate a common Kotlin value under shared/build at build time, using an empty value when the local setting is absent.
Do not commit the key or generated output, and do not use the supplied service-account credential.
Requests use the X-Goog-Api-Key header; errors must not echo request credentials or raw provider messages.
A key in a distributed client can be extracted; apply API/application restrictions and quota controls before distribution.
No new backend or dependency is included in this slice.

## Acceptance checks

1. Controlled tests cover spaced-delimiter parsing, query parameters, top-result selection, missing/invalid records, and recoverable search failures.
2. Controlled tests verify exactly one LRCLIB handoff after readiness and reject stale results after a newer search or direct-link submission.
3. Existing direct-link playback, lyric selection, timing adjustment, and foreground behavior remain covered.
4. Rendered checks cover the new search input and selected video metadata without provider HTML interpretation.
5. A live search with the configured credential and native playback verifies the integrated flow; fixture success alone does not satisfy this check.

## Sources

Checked 2026-09-28: [YouTube search.list](https://developers.google.com/youtube/v3/docs/search/list) documents relevance ordering, embeddable/syndicated filtering, and request parameters.
[YouTube authorization credentials](https://developers.google.com/youtube/registering_an_application) documents credential requirements and API keys for requests without OAuth tokens.

## Approved practice refinements

The operator requested duration-based lyric ranking, easier timing controls, separate discovery/practice screens, and single-song repeat by default.
Keep artist/title search and direct links on discovery; opening a candidate enters practice with the visible official player and lyrics.
Returning to discovery pauses playback, and returning to practice does not autoplay.
Returning to existing practice cancels an unfinished new song search.

Read video duration from the existing player, without an additional Data API request.
Sort valid lyric candidates by absolute duration difference before selecting the displayed 20; unknown lengths follow known lengths and ties preserve provider order.
Keep provider order until metadata arrives, then update ranking for rounded-second duration changes while preserving the current selection.
Defer reordering while a result control has focus.
Display the video length and each candidate's difference; duration similarity does not prove recording identity.

Provide 0.5-second earlier/later buttons and reset, with the existing ±600-second bounds.
Keep precise numeric entry in a collapsed detail section.
Do not add scroll-to-align behavior in this slice.
Use the official single-video playlist/loop parameters and setLoop API, with a checked-by-default repeat toggle for each new YouTube screen session.
Repeat must not bypass foreground and visibility pause rules.

The official [search resource](https://developers.google.com/youtube/v3/docs/search) omits duration; [video contentDetails](https://developers.google.com/youtube/v3/docs/videos#contentDetails.duration) supplies it through a separate resource.
The [IFrame getDuration API](https://developers.google.com/youtube/iframe_api_reference#getDuration) reports seconds and can return zero until metadata arrives.
The [loop parameter](https://developers.google.com/youtube/player_parameters#loop) requires the same video ID in playlist for single-video looping.

## Approved compact practice layout

The operator approved the UI review proposal to keep the video, active lyrics, and primary controls together without long page scrolling.
Keep the existing colors, official player, discovery screen, and request/playback contracts.
Use a viewport-sized practice grid: compact title/back bar, visible player, playback metadata, flexible lyric reading area, and bottom transport/timing controls.
Keep the player at least 200 pixels tall and wide in the tested layouts.
Use an internal scroll area for long active/plain lyrics; neighboring context is limited to two visible lines.
Move lyric search results, full metadata, and numeric timing entry into a scrollable modal dialog.
Pause before opening it, block playback while it is open, and do not autoplay when it closes.
Keep player errors visible even though routine playback status no longer occupies a full paragraph on screen.
Use side-by-side video and lyric/control columns in short landscape layouts.

Acceptance: controlled panel/lifecycle tests pass; an old-layout negative control fails the geometry check; 393 by 700, 320 by 568, and 852 by 393 browser layouts keep controls inside the viewport with no outer page overflow.
Check a long lyric, populated results, dialog focus/escape behavior, and enlarged text separately.
Browser fixtures establish layout and app interactions, not native keyboard behavior or real provider playback.
