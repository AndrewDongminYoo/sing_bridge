# YouTube Data API key restriction

Issue: #18.

## Why the issue's app restrictions do not fit

The issue asked for Android package/SHA-1 and iOS bundle-ID restrictions.
Google's [API key documentation](https://docs.cloud.google.com/docs/authentication/api-keys), read on 2026-09-30, says an Android-restricted key needs the `X-Android-Package` and `X-Android-Cert` headers, an iOS-restricted key needs `X-Ios-Bundle-Identifier`, and a key can carry only one application restriction type.
The app's search is a WebView `fetch` in `YouTubeSearch.kt` that sends only `X-Goog-Api-Key`, and one key serves both platforms, so neither app restriction fits.
Both platforms load the page with the base URL `https://io.github.andrewdongminyoo.singbridge/`, so a website (HTTP referrer) restriction on that origin covers both with one key.

## Settings

Andrew created a separate tester key in the Google Cloud console on 2026-09-30 and kept it out of Git in `local.properties`:

- API restriction: YouTube Data API v3 only.
- Application restriction: website `https://io.github.andrewdongminyoo.singbridge/*`.

The development key was left unrestricted until the #21 review finished, because that review used search.

A referrer can be forged by anyone who extracts the key from a build, like the app headers the other restriction types check, so the API restriction and the project quota are the limits that actually hold.

## Quota

The [getting-started page](https://developers.google.com/youtube/v3/getting-started) and the [quota cost page](https://developers.google.com/youtube/v3/determine_quota_cost) (last updated 2026-09-14 and 2026-09-15, read on 2026-09-30) give projects a default allocation of 100 `search.list` calls, 100 `videos.insert` calls, and 10,000 units per day for all other endpoints.
The quota cost page adds that `search.list` has its own bucket with a default limit of 100 per day at a cost of 1 per call; older versions of that page charged 100 units per search against the 10,000-unit pool.
The allocation belongs to the Google Cloud project, not to a key, so the tester and development keys draw on the same 100 searches.
The page calls only `search.list`, once per song search; opening a video link makes no API call.
So every build that uses a key of this project shares 100 song searches a day, which the Gate B plan (#26) has to budget for or raise through a quota request.

## Checks

| Check                                                                   | Result                                    |
| ----------------------------------------------------------------------- | ----------------------------------------- |
| `search.list` with the tester key and no `Referer`                      | 403, `API_KEY_HTTP_REFERRER_BLOCKED`      |
| The same with `Referer: https://example.com/`                           | 403, `API_KEY_HTTP_REFERRER_BLOCKED`      |
| The same with `Referer: https://io.github.andrewdongminyoo.singbridge/` | 200, one result                           |
| The development key with no `Referer`, before any change                | 200, so it had no application restriction |

Each request was sent with curl, reading the key from `local.properties` without printing it.

A debug build made with the tester key (`./gradlew :androidApp:assembleDebug`, exit 0) was installed on the Pixel_10 emulator, and a search for "Vaundy - odoriko" in the YouTube tab opened the first video and started the LRCLIB lookup, so Android WebView sends the page's referrer with the request.

A simulator build made with the same key (the README `xcodebuild` command, exit 0) was installed over the existing app on the iPhone 17 Pro simulator, which kept its saved library, and the same search opened the first video and started the LRCLIB lookup, so iOS WKWebView sends it too.
No app code changed: the page's default referrer policy already sends the origin on this cross-origin HTTPS request.

## Remaining

- Give tester builds the restricted key, and restrict or retire the development key once no session depends on it.
- Set a quota alert on `search.list` in the console; it was not set during this check.
