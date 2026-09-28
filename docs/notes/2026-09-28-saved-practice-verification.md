# Saved practice verification

## Scope and implementation

Added writing-system proportions and safe text previews for displayed lyric content.
Mixed Hangul, Kana, Han, Latin, and other supported scripts remain distinguishable; these are character labels, not confirmed language labels.
Kana prolonged marks use script extensions, and compatibility normalization covers decomposed Hangul and halfwidth Kana.
An explicit saved-practice list stores up to 20 video/LRCLIB pairs and signed offsets in device WebView storage.
Reopening fetches the exact record ID, validates it, and applies the offset only after successful selection without autoplay.
Provider lyrics and credentials are not serialized.

## Automated behavior

`node --test tools/test-youtube.mjs`: 66 tests passed.
The initial new tests failed because script labels and saved storage were absent.
Additional observed failures caught a stale success message after timing changes and prolonged Kana marks being classified as other letters.
The final suite covers mixed scripts, fresh page instances, exact-ID restore, no autoplay, signed offsets, updates/removal, full capacity, corrupt/future storage, quota failure, missing or mismatched records, cancellation, and retry backoff.
These tests execute shipped scripts with controlled DOM, player, storage, and network boundaries; they do not prove native storage behavior.

## Rendered browser and persistence

Used a named isolated `agent-browser` session, `singbridge-saved`, with generated HTML assembled from the current Kotlin templates and original test lyrics.
The fixture supplied only a controlled player and LRCLIB responses and contained no API key.
A real save through the UI survived a browser reload; opening the saved row restored LRCLIB ID 42 and offset 0.5 without autoplay.
The actual localStorage JSON contained only version, video ID, lyric ID, title, and offset.
Deleting the storage fixture made the reload check fail with `Saved practice missing after reload`; restoring it made the same check pass.
At 393×700, candidate metadata, mixed-script percentages, and text previews rendered in the settings panel.
At 320×568, discovery content width matched the 320-pixel viewport; the settings panel content and client widths both measured 280 pixels.
A synthetic 20-candidate mixed-script analysis took approximately 15 ms in this browser; this is not a mobile performance guarantee.
The browser session was closed.

Artifacts remain ignored under `build/qa/saved/`: `candidates.png`, `selection-saved.png`, `library.png`, `library-small.png`, and `selection-small.png`.

## Review and platform gates

A read-only behavior reviewer found no actionable defects in saved restoration, lifecycle cancellation, or classification and independently ran the 66-test suite.
A separate read-only storage/trust-boundary reviewer found no actionable defects and independently ran the same 66-test suite.
Scoped Trunk checks passed for implementation and contract files; `git diff --check` passed.
`./gradlew --no-daemon :shared:jvmTest :androidApp:assembleDebug :androidApp:lintDebug -Pkotlin.incremental=false` passed with the Android Studio JBR.
The JVM result XML reports 26 tests, zero failures, zero errors, and zero skips.
After the 1-minute machine load fell below its 10 CPU cores, a temporary isolated iOS probe was compiled and installed on the booted DeviceHub iPhone 17 Pro.
The probe used the current generated page, the same WKWebView configuration and HTTPS HTML base origin as SingBridge, original fixture lyrics, and controlled network/player responses.
A first read without saved data failed with `missing saved entry after relaunch`.
A write process saved video `M7lc1UVf-VE`, LRCLIB ID 42, and offset -2.5 through the shipped handlers.
After process termination, a fresh process restored all three values, displayed the mixed-script labels, and reported autoplay 0.
The probe reports are preserved under `build/qa/saved/probe/`; the temporary app was terminated and uninstalled.
This verifies WebView process-relaunch storage with the app's origin and configuration; it does not validate live provider playback or a manual native save flow.
The actual iOS host build passed with `xcodebuild -project iosApp/SingBridge.xcodeproj -scheme SingBridge -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath build/ios ARCHS=arm64 CODE_SIGNING_ALLOWED=NO build` and the Android Studio JBR.
The build reported the non-blocking AppIntents metadata-extraction warning because the app has no AppIntents framework dependency.
The new app was installed over the existing DeviceHub app without uninstalling it first.
The physical daily phone was not used.
The public LRCLIB `GET /api/get/35923881` endpoint was checked and returned the exact requested ID with synced lyrics; no commercial lyric text was saved into the repository.

## Authority and follow-up

The operator approved the earlier timed-scroll screen; that approval does not cover the new save and script-label controls.
Automatic transliteration, phrase-level language identification, lyric-row seeking, and transport/sync-control redesign remain outside this change.
Oracle retrieval returned `[no precedent found]` for this personal project scope.

## Candidate UI follow-up

The operator requested simpler Japanese labels and clearer candidate cards after inspecting the saved-practice build.
The displayed label now combines Kana and Han into Japanese when Kana is present, while Han-only text remains labeled Han and mixed Latin stays visible.
Percentages were removed from the UI.
Cards separate the title, artist/album metadata, script/sync badges, duration difference, and a two-line preview.
An album name identical to the title is omitted from the candidate card; the selected record's full metadata remains available.
The scoped change uses the existing CSS palette and semantic buttons with safe `textContent`, keyboard interaction, and a visible focus ring.

The updated behavior tests first failed on the old separate Kana/Han labels and percentage text, then passed after the display change.
`node --test tools/test-youtube.mjs` now passes 68 tests, including Han-only and mixed Japanese/Latin cases.
The DOM fixture now aggregates child text like a real DOM so existing selection and ranking tests cover the structured cards.
The shared JVM suite passed with 26 tests, zero failures, zero errors, and zero skips.
Scoped Trunk checks passed for both changed Kotlin templates and current documentation.
The iOS host build passed, and the updated app was installed over the existing DeviceHub build.
Android packaging was not rerun for this UI-only follow-up; the prior saved-practice Android build remains the last Android packaging result.

Rendered checks used original fixture lyrics in the isolated `singbridge-cards` browser session.
At 320×568, panel client/content width were both 280 pixels and card client/content width were both 246 pixels.
At 393×700, titles, badges, metadata, and previews were visually inspected in the rendered list.
Selecting the Japanese/Latin card loaded LRCLIB fixture ID 43 and displayed `표기: 일본어 · 라틴 문자`.
The browser session was closed.
Screenshots: `build/qa/saved/cards-polished.png` and `build/qa/saved/cards-small.png`.
This small UI-only follow-up received a local inline review; it did not change saved-reference or playback behavior and did not require another architecture decision or precedent query.

## Practice button follow-up

The operator approved the candidate cards and then invoked a design skill after discussing button design.
The marketing-page skill excludes product interfaces, so this pass used frontend-design within the approved cream/forest-green product UI.
The contract is `docs/specs/2026-09-28-practice-controls.md`.
Search, open, and save buttons now use a solid green primary style; navigation uses secondary outlines.
Visible playback-movement and lyric-sync captions separate the two footer rows.
Button IDs and handlers are unchanged, and candidate-card text retains its existing normal body weight.
Oracle retrieval for button hierarchy and practice controls returned `[no precedent found]`; no project precedent changed this direction.

The existing JavaScript suite executed the shipped control handlers and passed 68 tests.
The shared JVM suite passed 26 tests with zero failures, errors, or skips.
Scoped Trunk checks passed for the three modified templates and the design contract; `git diff --check` passed.
The iOS host build passed with the same non-blocking AppIntents metadata warning.
Android packaging was not rerun for this CSS/markup follow-up.
A local inline review found no new handler, storage, or provider-request changes.

The isolated `singbridge-buttons` browser rendered the actual templates with a fake player and original fixture lyrics.
Discovery, practice, and settings were visually inspected at 393×700.
At 320×568, document width/height matched the viewport, all seven visible buttons measured 44 pixels high, and the last button ended at y=556.
The lyric viewport remained 79 pixels high and the current fixture line occupied y=320.5–380.9 inside its y=312–391 bounds after resize settled.
At 852×393, the document matched the viewport, the lyric area measured 152 pixels high, and controls ended at y=381.
Keyboard Tab focused the save button with a visible 2-pixel outline; its computed primary background was rgb(38, 59, 53).
Clicking the existing 0.5-second-later control enabled the reset action.
Screenshots are ignored under `build/qa/saved/`: `buttons-discovery.png`, `buttons-practice.png`, `buttons-settings.png`, `buttons-small.png`, and `buttons-landscape.png`.
The browser session was closed.
These are controlled browser rendering checks, not a fresh native live-provider playback pass.
The operator approved the installed button UI before requesting this PR: “훨씬 낫네요. 화면 승인합니다. PR 올려주세요.”
The new button build was installed over the existing DeviceHub app and launched successfully (PID 64027); the physical phone was not used.
