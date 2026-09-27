# YouTube lyrics implementation plan

Base: merged PR4 at `3a06f4b` in the existing workspace.
Direction: continue the operator's YouTube/LRCLIB product discussion with explicit candidate selection and video timing adjustment.

1. Extend the shipped-page test harness with network and DOM boundaries; observe the missing-search failure.
2. Add the lyrics module and page integration, covering request lifecycle, untrusted provider data, timestamp parsing, and actual-player-time rendering.
3. Add focused regression cases and verify the complete JavaScript and shared JVM suites.
4. Build Android and iOS sequentially; inspect the rendered screen and record runtime limitations.
5. Review shared behavior and security boundaries independently, then repair confirmed contract issues.

Owned paths: shared YouTube HTML and lyrics module, `tools/test-youtube.mjs`, README, project guidance, and this feature's spec, plan, and verification note.
Preserve the two pre-existing untracked research documents.
Do not add a library or a native JavaScript bridge for this slice.
