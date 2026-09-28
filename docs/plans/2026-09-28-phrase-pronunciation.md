# Phrase pronunciation implementation plan

## Approved direction

The operator approved server AI processing with a lightweight model and authorized reuse of the local credential.
Use Node built-ins for a loopback development server, strict phrase validation, and native debug transports.
Do not deploy a public paid proxy.
No new runtime dependency is required.

## Sequence

1. Use the approved server boundary and Korean/English targets from the spec.
2. Run a small quality spike on the original cases before committing to the engine.
   Record engine/model/dictionary version, exact output, human corrections, latency, and measured request cost or package size as applicable.
3. Write failing tests for source reconstruction, mixed phrase preservation, result validation, unsupported locales, and stale completion rejection.
4. Implement the smallest provider adapter and strict result validation using existing tools; justify any new dependency with the spike evidence.
5. Connect an optional pronunciation layer to stable lyric row IDs and native preferred locale without changing player timing or saved references.
6. Add a compact target selector and original/pronunciation control in existing lyric settings; preserve fixed controls and safe text rendering.
7. Run shipped JavaScript tests, shared JVM tests, scoped Trunk, and sequential Android/iOS checks, then inspect actual native locale selection and playback during conversion.
8. Present fixture quality and rendered UI for operator review, with external processing and persistence limits stated explicitly.

## Likely implementation paths

Inspect and modify the shared `YouTubeLyrics.kt` and `YouTubeEmbed.kt` only where request state or rendering requires it.
Add one scoped pronunciation module and its tests if separation keeps the existing lyric module readable.
Inspect `iosApp/SingBridge/YouTubeScreen.swift` and the Android YouTube host for native locale/configuration injection.
Keep the local sample `PracticeSession` and unrelated research drafts unchanged.
Server code belongs in `server/`; production deployment and authentication remain outside this development slice.

## Verification evidence

See `docs/notes/2026-09-28-pronunciation-verification.md` for measured fixture quality, tests, build results, and remaining runtime limits.
Human singability review remains separate from structural validation.
