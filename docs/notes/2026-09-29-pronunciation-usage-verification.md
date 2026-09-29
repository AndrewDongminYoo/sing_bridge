# Pronunciation token usage verification

Date: 2026-09-29.
Issue: [AndrewDongminYoo/sing_bridge#20](https://github.com/AndrewDongminYoo/sing_bridge/issues/20).
Purpose: measure server-side token counts per song for the Gate A cost row in the [competitive brief](2026-09-29-competitive-brief.md#gate-a-before-inviting-testers).
The README section "Development pronunciation server" owns the log location, the record fields, the song grouping rule, and the report command; this note records only the checks performed and the measurement that is still missing.

## Checks performed

`node --test tools/test-youtube.mjs server/pronunciation.test.mjs` on Node 22.22.2 passed 99 of 99 tests, 5 of them new.
Every provider response in these tests comes from a fake fetcher; no paid request was made.
The new tests cover:

- usage reported for an incomplete body, a refusal, and a result that fails source reconstruction, since each is billed;
- the HTTP server recording exact records for an accepted result, a billed failure, a provider HTTP 500 (no record, a gap in `sequence`), and an invalid request ID header (recorded with `requestId: null`);
- serialized records never containing the lyric text, the key, or a video ID sent in the request ID header;
- per-song grouping, including a retry after a billed failure, a target change, a WebView reload that reuses a page counter, and a record without token counts;
- `node server/usage.mjs <log>` printing per-song and total rows from a log written by the server's own writer.

The new server checks were made to fail before their pass was trusted.
With two deliberate breaks applied together (the usage callback moved after the status check, and the lyric text added to every record), the billed-failure test and the server test failed.
Run alone against a record holding the lyric text, the privacy assertion also failed.
Both breaks were reverted before the final run.

`OPENAI_API_KEY=<fixture> node server/index.mjs` printed the usage log path and created no file before a request arrived.
`node server/usage.mjs` without any log printed `No pronunciation usage log found.` and exited 1.

`./gradlew :androidApp:compileDebugKotlin` after `bash ./setup.sh` never reached Kotlin compilation (`[TOOL_FAILED]`): all three attempts stopped during dependency resolution because Maven Central returned HTTP 429 (Too Many Requests).
The Kotlin bridge change (one `setRequestProperty` line next to the existing client header) is therefore not compiled here.

The Swift bridge change (one `setValue` line next to the existing client header) was not compiled: this hosted Linux container has no Xcode.
`trunk check` could not run because the session egress policy returned HTTP 403 for the Trunk plugin download from GitHub.
As a substitute, the Trunk-pinned versions ran directly from npm on the changed files: `prettier@3.9.9 --check`, `cspell@9.8.0`, and `markdownlint-cli@0.49.1` with `.trunk/configs/.markdownlint.yaml` passed after Prettier reformatted the new test code, and `git diff --check` passed.
ktlint and the security scanners did not run.

## Development run: not performed

Tokens per song for a real run are `[UNKNOWN]`.
This hosted container has no `OPENAI_API_KEY`, so no provider request was made, and no fixture numbers are reported as measurements.
The issue stays open until this section holds real numbers.

Procedure for the development machine:

1. Start the server as the README describes and note the usage log path it prints.
2. With a Debug build, choose synced lyrics for a few songs and tap **음차 만들기** once per song, recording the song order.
3. Stop the server and run `node server/usage.mjs`.
4. Paste the printed table here, with the song order from step 2 and the lyric line count of each song.
5. For cost, multiply the token sums by the pinned model's prices from OpenAI's pricing page and cite its access date; this note records no price.

## Limits

- A request cancelled or timed out after the provider started generating may still be billed, but no usage is returned, so it is not recorded.
- Song grouping depends on the request ID that the updated native bridges forward; builds from before this change send none, and their records group as `unknown`.
- The 100-call process cap still applies, and each server start writes a new log file.
