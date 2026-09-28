# Pronunciation development verification

## Scope and authority

The operator approved server AI processing with a lightweight model and reuse of the provided credential.
The implementation adds a loopback Node server, debug native transports, phrase language results, and an optional pronunciation layer for timed YouTube lyrics.
It introduces no runtime dependencies.
It does not deploy a service or enable pronunciation in release builds.
The existing unrelated research drafts and credential ignore change remain outside this implementation.
Personal project Oracle retrieval returned `[no precedent found]`; no external project precedent drove the design.

## Quality spike

Only the original short fixtures in the spec were submitted during these checks.
`gpt-5.4-nano-2026-03-17` repeatedly changed source text, including a mixed-script replacement inside a Japanese source phrase.
One structurally valid nano response also classified romanized Japanese as English.
The strict validator rejected source mutation before rendering.
Prompt refinement alone did not resolve the source mutation reliably in this small test.

The selected model is `gpt-5.4-mini-2026-03-17` with default reasoning and strict structured output.
The final two mini fixture requests preserved all source partitions and returned the following examples:

| Source | Target | Observed output |
| --- | --- | --- |
| 오늘도 stay with me | Korean | 오늘도 스테이 위드 미; Korean retained, English converted |
| 明日は君と歩く | Korean | 아시타와 키미토 아루쿠 |
| ねえ、空へ行こう | Korean | 네에、소라에 이코- |
| Kimi to arukou | Korean | 키미 토 아루코-; classified as Japanese |
| 君と sing with me | Korean | 키미토 싱 위드 미; separate Japanese and English phrases |
| 같이 걸어요 | English | gachi georeoyo |
| 봄날에 만나요 | English | bomnare mannayo |

The eight-line Korean-target request took 2,944 ms and reported 510 input tokens and 527 output tokens.
The two-line English-target request took 1,293 ms and reported 424 input tokens and 97 output tokens.
At the documented standard rates of $0.75 input and $4.50 output per million tokens, those two requests estimate $0.0035085 combined.
This is not the total cost of all exploratory calls and is not a full-song cost estimate.
Model snapshot and rates: [OpenAI mini model documentation](https://developers.openai.com/api/docs/models/gpt-5.4-mini), accessed 2026-09-28.

Quality remains provisional: the model did not mark the ambiguous 明日 reading for review, and it emitted separate uncertain whitespace segments despite the prompt.
The UI preserves whitespace without presenting it as an unknown language badge.
All displayed language labels and pronunciation remain AI estimates; structural validity does not establish sung pronunciation accuracy.
Japanese long-vowel spelling and English-oriented Korean readability still need operator review.
The instruction-like fixture was treated as source text rather than executed.

## Automated evidence

`node --test tools/test-youtube.mjs server/pronunciation.test.mjs`: 79 passing tests.
The tests inspect exact source reconstruction, ordered IDs, bounds, same-language preservation, provider refusal, strict schema and redirect policy, HTTP browser rejection, concurrency limits, row identity, timing/offset preservation, hide/show, supported locales, forged port messages, active cancellation, and stale partial results.
The newly introduced suites first failed because the implementation modules did not exist.
The invalid-response cases explicitly assert rejection.

`JAVA_HOME='/Applications/Android Studio.app/Contents/jbr/Contents/Home' ./gradlew --no-daemon :shared:jvmTest :androidApp:assembleDebug :androidApp:lintDebug -Pkotlin.incremental=false`: passed after adding the required debug network domain attribute.
The loopback cleartext exception applies only to Android debug resources.
Existing Android lint warnings about target API and backup configuration are not fixed in this scope.

The iOS simulator build passed after correcting `callAsyncJavaScript` to the installed SDK's `(_:arguments:in:in:completionHandler:)` signature.
One review incorrectly flagged that signature; the reviewer withdrew the finding after inspecting the successful compiler evidence.
Behavior and security reviews have no remaining blocker.
The provider redirect recommendation was implemented as `redirect: 'error'` and covered by a test.

A real request through `http://127.0.0.1:18773/pronunciation` returned HTTP 200 for the original mixed Korean/English fixture.
It retained the Korean phrase and returned the English phrase as Hangul pronunciation.
This checks the local HTTP server, credential loading, upstream call, and result validation together.

## UI and native limits

A controlled browser page used the shipped HTML and the actual mini fixture result, with a fake player and native transport.
At 393 × 700, document height was 700 and the control footer ended at 688.
At 700 × 393, document height was 393 and the footer ended at 381.
These checks support the fixed-control layout with the new layer; they do not prove native playback or network behavior.
Screenshots are in ignored `build/qa/pronunciation-settings.png` and `build/qa/pronunciation-practice.png`.

The debug app was installed over the existing DeviceHub app and launched on the booted iPhone 18 Pro, UDID `88F93347-37E2-4EE9-9C1C-86E89C6896AE`.
The final source was rebuilt successfully, reinstalled, and launched as PID 85751; a direct simctl screenshot confirmed the SingBridge home screen.
Final build logs are `build/qa/pronunciation-android-final.log` and `build/qa/pronunciation-ios-final.log`.
XcodeBuildMCP found the device, but `snapshot_ui` timed out while creating a remote automation session.
Therefore native initial-locale selection, WebKit message delivery, and the complete in-app conversion flow remain unverified.
No physical device was used.

## Remaining product boundaries

The server trusts local development processes, permits one active conversion, and stops new provider calls after 100 calls per process.
Native clients cannot choose a destination URL and do not follow redirects.
Public deployment requires authentication, HTTPS, abuse controls, and a separately approved lyric-processing policy.
Server `store: false` requests do not establish zero provider retention.
Pronunciation results are memory-only, and the existing saved video/lyric/offset references remain unchanged.
Plain lyrics, arbitrary target languages, correction editing, and cached pronunciation remain future work.
