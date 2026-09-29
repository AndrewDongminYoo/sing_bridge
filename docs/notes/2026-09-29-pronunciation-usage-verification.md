# Pronunciation token usage verification

<!-- cspell:words dism -->

Date: 2026-09-29.
Issue: [AndrewDongminYoo/sing_bridge#20](https://github.com/AndrewDongminYoo/sing_bridge/issues/20).
Purpose: measure server-side token counts per song for the Gate A cost row in the [competitive brief](2026-09-29-competitive-brief.md#gate-a-before-inviting-testers).
The README section "Development pronunciation server" owns the log location, the record fields, the song grouping rule, and the report command; this note records only the checks performed and the measurement that is still missing.

## Checks performed

`node --test tools/test-youtube.mjs server/pronunciation.test.mjs` on Node 22.22.2 passed 100 of 100 tests, 5 of them new (`server/pronunciation.test.mjs` went from 6 to 10 tests, and `tools/test-youtube.mjs` gained one).
Every provider response in these tests comes from a fake fetcher; no paid request was made.
The new tests cover:

- usage reported for an incomplete body, a refusal, and a result that fails source reconstruction, since each is billed;
- the HTTP server recording exact records for an accepted result, a billed failure, a provider HTTP 500 (no record, a gap in `sequence`), and an invalid request ID header (recorded with `requestId: null`);
- serialized records never containing the lyric text, the key, or a video ID sent in the request ID header;
- per-song grouping, including a retry after a billed failure, a target change, a repeated prefix that is not adjacent, and a record without token counts;
- `node server/usage.mjs <log>` printing per-song and total rows from a log written by the server's own writer;
- two page loads five seconds apart that repeat the same reset sequence sending request IDs with different prefixes, in the bridge format.

Codex review on PR #28 reported that the page counter restarted at 0 on every page load, so repeating the same flow after an app restart produced the same prefix and merged two songs.
The page-lifetime test failed on that code with both prefixes `3`; the counter now starts at the page load time and the test passes.

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

## Development run

One server run on the development Mac on 2026-09-29 at about 07:24 UTC recorded 16 billed requests for five songs, sent by the [time-to-first-sing measurement](2026-09-29-first-sing-timing.md) rather than a Debug build.
That script used the page's batching (up to 12 lines and 3,000 characters, sequential) and request ID format, so records grouped per song as they would from the app.
`node server/usage.mjs` printed:

| Song                         | Lines in song | Requests | Failed | Lines sent | Input tokens | Cached input tokens | Output tokens | Reasoning tokens |
| ---------------------------- | ------------- | -------- | ------ | ---------- | ------------ | ------------------- | ------------- | ---------------- |
| Vaundy - 踊り子              | 50            | 5        | 0      | 50         | 3,074        | 0                   | 3,237         | 0                |
| YOASOBI - 夜に駆ける         | 56            | 2        | 1      | 24         | 1,256        | 0                   | 1,335         | 0                |
| Official髭男dism - Pretender | 52            | 5        | 0      | 52         | 2,981        | 0                   | 3,161         | 0                |
| King Gnu - 白日              | 82            | 2        | 1      | 24         | 1,174        | 0                   | 1,148         | 0                |
| あいみょん - マリーゴールド  | 47            | 2        | 1      | 24         | 1,239        | 0                   | 1,286         | 0                |
| Total                        |               | 16       | 3      | 174        | 9,724        | 0                   | 10,167        | 0                |

The two completed songs used about 3,000 input and 3,200 output tokens for 50 to 52 lines, or roughly 60 input and 63 output tokens per line.
The three failed requests were billed and then rejected by result validation, which stopped those songs after 24 lines; that defect is #29.
Three later diagnostic reruns of the failed batches called the provider directly and are not in this log.
The price per song is `[UNKNOWN]`: no price was looked up; multiply these sums by the pinned model's prices from OpenAI's pricing page and cite its access date.

## Limits

- A request cancelled or timed out after the provider started generating may still be billed, but no usage is returned, so it is not recorded.
- Song grouping depends on the request ID that the updated native bridges forward; builds from before this change send none, and their records group as `unknown`.
- The 100-call process cap still applies, and each server start writes a new log file.
