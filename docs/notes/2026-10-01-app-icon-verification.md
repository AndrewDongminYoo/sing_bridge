# App icon verification

## Change

- The mark is a beamed note pair whose beam is a bridge deck over a round arch; the right note head is gold.
  It uses the app's existing Pine `#235E52`, Paper `#FAF7F0`, and Gold `#EEC779` colors.
- `tools/generate_app_icon.py` holds the only geometry and writes every icon file with the Python standard library:
  - Android: an adaptive icon in `mipmap-anydpi/ic_launcher.xml` with a Pine background color, a vector foreground, and a monochrome layer for themed icons.
    The manifest now points to `@mipmap/ic_launcher`, and the placeholder `drawable/ic_launcher.xml` is removed.
  - iOS: `Assets.xcassets/AppIcon.appiconset` with one opaque, full-bleed 1024 px `AppIcon.png`.
    `project.yml` is unchanged, because XcodeGen's iOS application preset already sets the asset catalog app icon name to `AppIcon`.
- The Android foreground is scaled so that the farthest point of the mark (115.8 units from the center, on the left note head) sits on the 66 dp safe circle of the 108 dp canvas.

## Generator

- Two runs produced the same `AppIcon.png` (SHA-1 `216c6e40c47009e26285ea9b407a3784fc1248bd`), also after `trunk fmt` reformatted the script.
- `sips -g hasAlpha` reports `no` and `pixelWidth` 1024 for `AppIcon.png`.
- The PNG rasterizer has its own inside-shape test, separate from the path data.
  The 1024 px PNG and a render of the generator's preview SVG were viewed separately, and their geometry matched.
- A scratch render of the Android foreground under a full square, a circle, and a rounded-square mask, with the 66 dp circle drawn on top, showed the whole mark inside the circle.

## Build

- `./gradlew :androidApp:assembleDebug :androidApp:lintDebug` passed.
  Lint reports 5 warnings and 1 hint, none in the icon files or the changed manifest line.
- `aapt2 dump badging` on the debug APK shows `application-icon` as `res/mipmap-anydpi-v21/ic_launcher.xml`; aapt2 adds the `v21` qualifier itself.
- `xcodegen generate --spec iosApp/project.yml` put `Assets.xcassets` in the Resources phase, and the simulator build command in `README.md` succeeded.
  The built `Info.plist` has `CFBundleIconName` `AppIcon`, and the bundle contains `Assets.car` with `AppIcon60x60@2x.png`.
- `trunk check --no-fix` on the changed files reports no issues.

## Simulator check

iPhone 18 Pro simulator on iOS 27.0, with the Debug build installed over the existing app.
The home screen shows the SingBridge icon with the system corner mask, the arch opening, and the gold note head.

## Not checked

- The Android launcher on an emulator or device, including the themed (monochrome) icon.
  The load average rose above 70 after the simulator shut down, so no emulator was booted.
- iOS dark and tinted home screen appearances; the icon set provides no dark or tinted variant.
- A trademark search for the mark.
