# Main navigation verification

## Automated checks

Two new SongLibrary tests initially failed against an inert visibility setter.
They prove that leaving Home pauses without releasing the current player, returning does not autoplay, and foregrounding another tab does not enable hidden practice.
After implementing the independent visibility condition, `:shared:jvmTest`, `:androidApp:assembleDebug`, and `:androidApp:lintDebug` passed together.
The initial compile attempts caught a Kotlin property-setter signature collision and a ComposeView receiver used instead of the Activity context; both were corrected before the successful build.

`node --test tools/test-youtube.mjs server/pronunciation.test.mjs` passed all 94 tests.
These exercise the existing page/player and pronunciation contracts, including pause/resume semantics; they are not native tab interaction tests.
Scoped Trunk checks passed for the changed Kotlin and documentation.

## Review

Independent read-only reviews covered Android/shared state and iOS/WebView lifetime.
Both returned clear results with no blocking findings.
The root additionally checked source preservation, hidden-player behavior, persistent child-view identity, callbacks after import, and unchanged storage ownership.
The reviewers did not run heavy native jobs; their approval does not substitute for runtime evidence.

## Runtime evidence

The target is iPhone 17 Pro on iOS 27.0, simulator `3AA6657C-B611-4A12-A3A9-6A56CDCF2F64`.
Root visual inspection confirmed that the Home controls, YouTube input page, and My Songs import controls fit above the native tab bar in these captures:

- `build/qa/navigation-home.png`
- `build/qa/navigation-youtube.png`
- `build/qa/navigation-my-songs.png`

The screenshots are ignored local artifacts and do not replace operator visual approval.
The unsigned Debug iOS host built successfully and was installed over the existing app without uninstalling it.
A second bounded QA pass used the running app without building, installing, or relaunching it.
It selected the third Home lyric, played and paused at the nonzero end position `0:28 / 0:28`, then switched Home → YouTube → Home.
The selected third lyric, displayed position, and paused `재생` action remained unchanged.
This establishes retention at the observed end position, not mid-track playback continuity.
The final app remains on Home, paused.
Evidence: `build/qa/home-paused-third-lyric.jpg`, `build/qa/youtube-tab-verified.jpg`, `build/qa/home-retained-after-youtube.jpg`, and `build/qa/final-home-paused.jpg`.

The first pass opened and cancelled the audio picker without selecting a file.
No pending audio draft was available, so draft preservation and successful import navigation were not exercised natively.
YouTube's artist/title field was visible but absent from the tool's accessibility tree; the available tap tool accepted only accessibility element references, with no coordinate endpoint.
No text was entered or pasted, and input retention across tabs remains a manual acceptance check.
This is an automation targeting limitation, not evidence that native typing or paste fails or that the device is locked.
Actual YouTube playback suspension across tabs also remains unverified natively; shared page tests and static host review cover the implementation contract.

## Limits

Android runtime layout and interaction have not been exercised on an emulator or device in this pass.
No physical-device writes, paid AI requests, provider-policy changes, or storage migrations are included.
Tab state retention applies to the lifetime of the current host; process death or activity recreation is not a new persistence guarantee.
Oracle returned `[no precedent found]`; current code, tests, and runtime evidence guide this implementation.
