# Main navigation implementation

## Direction

The operator requested grouping Home, YouTube, and local import into navigation tabs.
Use retained platform tab content rather than a new navigation dependency or a rewritten player.
iOS uses a native tab controller hosting the existing Compose practice/import controllers and SwiftUI YouTube host.
Android keeps its three views within one activity with a Compose navigation bar.
This preserves the existing WebView bridges and their ownership while avoiding repeated page loads.
Oracle returned `[no precedent found]` for tab navigation and playback visibility.

## Steps and checks

1. Add failing shared tests for independent practice visibility and foreground state; implement the smallest SongLibrary visibility condition and use it in local controls/polling.
2. Add a full-page import destination using the existing import contract; leave the legacy dialog API compatible and preserve explicit cancel/dispose behavior.
3. Replace the iOS full-screen cover with a retained native tab host, hide the close toolbar in the embedded YouTube host, and return to Home after an explicit successful import.
4. Extract the Android YouTube view from its activity and embed retained content under the same bottom navigation; preserve pause, browser links, pronunciation bridge, and destruction paths.
5. Run shared JVM tests and Node page/server tests, then Android build/lint and the iOS host build sequentially.
6. Verify iOS 27.0 tab selection, local pause/resume rules, YouTube state retention, import navigation, and safe-area layout; capture all tabs for visual review.
7. Run scoped Trunk checks, adversarial review, then continue the authorized PR loop with both hosted reviews.

## Limits

No data migrations, new libraries, provider changes, AI requests, automatic playback, or physical-device writes.
The user-facing navigation changes span the shared app/library, Android activity/view/manifest, and iOS host/importer/YouTube wrapper.
Existing single-song storage remains intact.

## Platform references

- [Apple tab navigation](https://developer.apple.com/documentation/uikit/uitabbarcontroller)
- [Compose navigation bar](https://developer.android.com/develop/ui/compose/components/navigation-bar)
