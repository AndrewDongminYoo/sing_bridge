# Search-first navigation

Supersedes the tab order and names in [main navigation](2026-09-29-main-navigation.md); its state, playback, and import rules still hold.

## Why

The core flow is song search, LRCLIB lyrics, and AI 음차 on the YouTube page, and the product gates (#19, #21, #24) measure that flow.
The app opened on Home, a 28-second instrumental sample, so a new user saw a demo before the core flow.
Andrew chose on 2026-09-30 to make the YouTube page the entry by reordering and renaming the tabs.

## Scope

- Bottom tabs, in order: **노래 찾기** (the YouTube page), **연습** (the former Home: the sample or the last imported song), **내 노래** (audio/LRC import).
- The app opens on **노래 찾기** on Android and iOS.
- A successful import returns to **연습** without autoplay.
- Android Back returns to **노래 찾기** from another tab before exiting.
- The screens themselves do not change; only their tab position, label, and icon do.

## Acceptance

- Both platforms show the three tabs in this order and open on **노래 찾기**.
- Local practice is enabled only while **연습** is selected, and the YouTube player is active only while **노래 찾기** is selected and the app is in the foreground.
- A successful import selects **연습**.
- Android debug build and lint, the iOS simulator build, and screenshots of the launch tab on both platforms.
