# Lyric sync disclosure implementation

## Scope

Change only the shared YouTube lyric markup and its control CSS, plus the current README and scoped verification documents.
No native adapters, dependencies, data formats, or timing calculations change.
Oracle returned `[no precedent found]`; the prior user observation and current modal pause behavior justify the inline disclosure.

## Steps

1. Assemble the shipped page into an ignored local fixture and demonstrate that sync actions are currently visible by default.
2. Wrap the existing sync buttons in a native details element with a clear summary and a short explanation of their effect.
3. Verify expand/collapse, offset persistence, unchanged player commands, keyboard operation, portrait/landscape bounds, and screenshots in a named browser session.
4. Run the existing Node behavior suite, shared JVM tests, and scoped Trunk checks; assess the small diff inline.
5. Commit the coherent change, open a PR, and verify both hosted reviews and all native build jobs.
6. Request operator visual approval with the recorded browser-fixture limit.
