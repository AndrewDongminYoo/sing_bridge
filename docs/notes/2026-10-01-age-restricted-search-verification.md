# Age-restricted search results verification

<!-- cspell:words mirai -->

Issue: #70.
Spec: [song search](../specs/2026-09-28-song-search.md).

## Quota

Read from the [quota cost page](https://developers.google.com/youtube/v3/determine_quota_cost) on 2026-10-01: `search.list` has its own bucket of 100 calls per day at 1 per call, `videos.list` costs 1 unit from the shared 10,000-unit daily bucket, and each extra result page costs another call.
Asking for five results is still one page, so the change adds one `videos.list` unit per search and nothing to the `search.list` bucket.

## Automated checks

- New page tests failed first and pass with the change: an age-restricted first result is skipped, all-restricted results open nothing, and a timeout during the rating lookup shows the timeout message; a fourth test, a failed lookup keeping the first result, guards the fallback and passed before and after.
- The existing song-search test now expects `maxResults=5` and the `videos.list` request, and four search-order tests answer that request at once through a `withoutRatings` helper, so they still control only the search responses.
- `node --test tools/test-youtube.mjs server/pronunciation.test.mjs`: 179 tests pass.

## Live API check

The page's two requests, sent once from the Mac with the development key and the app referrer, for the query `YOASOBI 夜に駆ける`:

| Rank | Video         | `ytRating`        | Title · channel                                        |
| ---: | ------------- | ----------------- | ------------------------------------------------------ |
|    1 | `x8VYWazR5mE` | `ytAgeRestricted` | YOASOBI「夜に駆ける」 Official Music Video · YOASOBI   |
|    2 | `by4SYYWlhEs` | none              | 夜に駆ける · YOASOBI - Topic                           |
|    3 | `j1hft9Wjq9U` | none              | YOASOBI - 夜に駆ける / THE HOME TAKE · THE FIRST TAKE  |
|    4 | `_ZtBv0hTm1w` | none              | YOASOBI「夜に駆ける」 from ROCK IN JAPAN FESTIVAL 2022 |
|    5 | `GEIf9Dp6GgQ` | none              | YOASOBI 夜に駆ける · coco mirai                        |

The page's rule opens `by4SYYWlhEs`, the Topic upload that #70 found playable.

## Not checked

- The app on a simulator or emulator; the change is in the page script, which the Node tests run.
- Rerunning the #24 timing protocol with this query.
