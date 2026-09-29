# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

`AGENTS.md` owns project scope, workflow rules, and the check commands; `README.md` owns user-facing behavior, prerequisites, and native build commands.
This file adds only what those two do not say.

@AGENTS.md

## Running a single test

```bash
./gradlew :shared:jvmTest --tests 'io.github.andrewdongminyoo.singbridge.LrcParserTest'
node --test --test-name-pattern="accepts supported YouTube links" tools/test-youtube.mjs
```

The offline pronunciation reference tool is its own npm package; CI runs it, but the `AGENTS.md` check list does not.
Its commands are in `tools/pronunciation-quality/README.md`.

## Architecture

The app has two practice surfaces built on different technologies.

### Local practice: Compose

The **홈** and **내 노래** tabs are Compose Multiplatform screens in `shared/src/commonMain`.
`PracticeSession` holds line highlighting, seeking, and repeat decisions against the `AudioPlayer` interface, which `AndroidAudioPlayer` (Media3) and `IosAudioPlayer` (AVPlayer) implement.
`commonTest` drives `PracticeSession` with a controlled `AudioPlayer`, so practice behavior is tested on the JVM target without a device.
`SongLibrary` switches between the bundled sample and an imported song; the platform hosts own file picking and persistence (`androidApp/.../LastSongStore.kt`, `iosApp/SingBridge/LastSongStore.swift`, `SongImporter.swift`).

### YouTube practice: one WebView page stored in Kotlin strings

The **YouTube** tab is not Compose.
It is a single HTML/JS page that lives in Kotlin raw strings:

- `YouTubeEmbed.kt` holds the page template and replaces the placeholders `__SEARCH__`, `__LYRICS__`, `__PRONUNCIATION__`, and `__LIBRARY__` with the fragments from `YouTubeSearch.kt`, `YouTubeLyrics.kt`, `YouTubePronunciation.kt`, and `YouTubeLibrary.kt`.
- `__YOUTUBE_API_KEY__` comes from `youtubeDataApiKey`, which the `generateYouTubeConfig` task in `shared/build.gradle.kts` writes under `shared/build/generated/youtubeConfig`.
- Android `YouTubePlayerView.kt` and iOS `YouTubeScreen.swift` load the page with the base URL `https://<app id>/`, which also replaces `__APP_ORIGIN__`.
- Saved practices, including their pronunciation layers, are stored by the `YouTubeLibrary.kt` script in WebView `localStorage`, not in Kotlin.

`tools/test-youtube.mjs` reads these Kotlin files as text, takes the first `"""` block of each, and runs its `<script>` contents in `node:vm` with fake DOM, player, network, and storage objects.
So page logic is tested by Node, not by Gradle, and each of those files must keep its HTML as the first raw string literal.

### Pronunciation server path

AI pronunciation requests go from the page script to a native transport, then to the loopback server in `server/`:

```log
page script → Android WebMessagePort / iOS WKScriptMessageHandler (PronunciationBridge.kt / .swift)
            → http://127.0.0.1:18773/pronunciation → server/index.mjs → OpenAI
```

`server/pronunciation.test.mjs` covers the server contract without paid requests.

### Tab hosting

The bottom tabs are assembled natively on each platform, not in Compose.
Android `MainActivity` switches between native views and uses the Compose `AppNavigationBar` only for the bar.
iOS `SingBridgeApp.swift` builds a `UITabBarController` from `MainViewController(tabbed: true)`, the SwiftUI `YouTubeScreen`, and `ImportViewController`.

## Docs

Features are documented by dated slug across `docs/specs/`, `docs/plans/`, and `docs/notes/` (for example `2026-09-29-main-navigation.md` in all three, with the note suffixed `-verification`); a few features lack one of the three or use different dates.
Read the matching spec before changing a feature's behavior, and record checks actually performed in a new note.
