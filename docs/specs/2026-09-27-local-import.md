# Local song import

## Scope

Import one user-selected audio file and one UTF-8 LRC file on Android and iOS, and restore the last imported song after relaunch.
Use native document pickers and existing playback adapters without new dependencies or storage permissions.
Keep the current song until both inputs validate, pause before opening a picker, and never autoplay after import or cancellation.
Copy the selected audio into app-private storage before inspecting its native media duration.
Limit audio copies to 256 MiB; retain only the committed copy plus a temporary draft while importing.
Persist a versioned manifest with the audio basename, display name, and source LRC using atomic replacement.
Do not persist generated pronunciation or derived timing objects; rebuild the practice track from the source LRC and actual media metadata when restoring.
Allow returning to the bundled sample, which clears the saved song.
Release replaced players and iOS security-scoped file access after copying.
Delete abandoned copies on cancellation or the next startup.

Imported lyrics display their original text without generated pronunciation.
Multi-song libraries, automatic transliteration, offset editing, streaming integrations, and lyric downloads are outside this change.
Files supplied by a cloud document provider may require that provider to download them.

## LRC subset

Accept UTF-8 with an optional BOM, LF or CRLF, timestamps in `mm:ss`, `mm:ss.xx`, or `mm:ss.xxx` form, and multiple leading timestamps per line.
Sort timestamps and combine nonempty lines sharing a timestamp in source order.
An empty timestamp ends the preceding lyric and creates a silent interval.
The final nonempty lyric ends at the audio duration.
Ignore standard descriptive metadata (`ar`, `al`, `ti`, `au`, `by`, `re`, `ve`, `length`) and zero offset.
Reject nonzero offsets, enhanced word timestamps, malformed lines, timestamps beyond the audio, and files without timed lyrics instead of silently changing their meaning.
Limit lyric input to 1 MiB and 10,000 timestamp entries.

## Acceptance

- A failed or canceled import preserves the previous song, paused.
- A successful import shows the file name, actual duration, and original timed lyrics.
- Seeking, highlighting, repeat, hiding, and foreground-only playback work with the imported track.
- File access and player resources are released when replaced or closed.
- Relaunch restores the committed song while remaining paused, even if the original selected files are unavailable.
- Storage failure preserves the previous song and keeps the draft available for retry.
- Returning to the sample clears the saved song; a subsequent launch opens the sample.
- Shared tests cover parsing, import rollback, and resource ownership.
- Android and iOS hosts compile with their real picker integrations.
- Record native runtime checks separately from compile results.

## Platform references

[Android Storage Access Framework](https://developer.android.com/training/data-storage/shared/documents-files) provides user-selected document access without broad storage permission.
[Apple fileImporter](https://developer.apple.com/documentation/swiftui/view/fileimporter(ispresented:allowedcontenttypes:allowsmultipleselection:oncompletion:)) supplies the system picker; imported URLs require balanced security-scoped access.
