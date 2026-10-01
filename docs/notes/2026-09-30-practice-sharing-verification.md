# Practice sharing verification

<!-- cspell:words Oxzd MNTJ Novelbright -->

Spec: [practice sharing](../specs/2026-09-30-practice-sharing.md).
Issues: #65 (page, merged in #68) and #66 (native share bridges).

## Test code

`singbridge:1:OxzdMNTJXmg:35549827:250`: the video `OxzdMNTJXmg` (Novelbright - Walking with you, found with one YouTube Data API search) and the LRCLIB record 35549827 (synced, 229 s), with an offset of 0.25 seconds.
The code was meant to carry `1250`; idb dropped one typed character, and the resulting code is still valid, so the checks used it as typed.

## iOS

Builds: the README simulator `xcodebuild` command with `-configuration Release`, then again with `-configuration Debug`, both `BUILD SUCCEEDED`.

On the iPhone 17 Pro simulator (iOS 27.0), with the Release build installed over the existing app:

- The code typed into the 노래 찾기 link field opened the video, fetched LRCLIB 35549827, and showed the offset as 0.25초 늦게; the title came from the fetched record, and lyric settings showed 공유받은 연습을 열었어요.
- 이 연습 공유 was visible in the Release build, so the share handler is registered outside Debug.
- It opened the share sheet, and its Copy action put this message on the pasteboard, read back with `xcrun simctl pbpaste`:

  ```log
  singbridge:1:OxzdMNTJXmg:35549827:250
  SingBridge 연습: Novelbright - Novelbright - Walking with you
  https://youtu.be/OxzdMNTJXmg
  ```

On the iPad Pro 11-inch simulator, with the same Release build:

- The code from the iPhone opened the same video, record, and offset.
- 이 연습 공유 presented the share sheet as a popover anchored to the web view, and Copy produced the same three lines.

The frame and origin checks were reviewed in code, not triggered on a device: no test page can make the embedded player post to the handler.

## Android

Build: `./gradlew :androidApp:assembleDebug :androidApp:lintDebug`, `BUILD SUCCESSFUL`.
Lint reports one warning in `ShareBridge.kt`, `UseKtx` for `Uri.parse`, which `PronunciationBridge.kt` has at the same call; it was left to match that code.

On the Pixel_10 emulator, with the debug APK installed over the existing app (`adb install -r`):

- The code typed into the 노래 찾기 link field and submitted with Enter opened the same video, LRCLIB 35549827, and 0.25초 늦게 as on iOS.
- 이 연습 공유 was visible in lyric settings, so the page received the share port.
- It opened the Android chooser, whose text preview showed the same three lines that iOS copied:

  ```log
  singbridge:1:OxzdMNTJXmg:35549827:250
  SingBridge 연습: Novelbright - Novelbright - Walking with you
  https://youtu.be/OxzdMNTJXmg
  ```

The Android message was not opened on iOS as a separate step.
The preview showed the same three lines, the message is built by the page script that both platforms share, and `ShareBridge.kt` passes `message.data` to `EXTRA_TEXT` unchanged; iOS opened that code above.
Only the debug build was run; the bridge is attached outside the `FLAG_DEBUGGABLE` check, which was reviewed in code.
The repeated artist in the title comes from the LRCLIB record, not from the bridges: `https://lrclib.net/api/get/35549827` returns `artistName` `Novelbright` and `trackName` `Novelbright - Walking with you`.

## What happened during the checks

- `xcrun simctl pbcopy` exited 0 but did not change the device pasteboard: the iPhone kept an older string and the freshly booted iPad read back empty, so a pasted message could not be tested on iOS; the code was typed instead.
  Pasted text with joined lines is covered by the page tests merged in #68.
- A long `idb ui text` call kept delivering characters after it returned and dropped one; typing in short pieces worked.
- An `idb ui swipe` meant to scroll lyric settings landed as a tap and switched 음차 숨기기 to 음차 보기 on the iPhone; this is page state for the session, not saved data.
- A Release build has no pronunciation bridge, so the Debug build was installed over the app on the iPhone afterwards, which kept its saved practices for #21.
- The load average briefly exceeded 100 around the Debug build and the iPad shutdown, with other sessions' work running, and fell to about 14 within three minutes.
- The first Android build failed at `processDebugResources` with `AAPT2 ... Daemon startup failed` while the load average reached about 500 from other work; the same command succeeded once it was below 10.
