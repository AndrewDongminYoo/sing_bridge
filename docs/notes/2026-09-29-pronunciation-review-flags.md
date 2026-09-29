# Review-flagged pronunciation batches

Issue: #37.
Follows the [#29 batch rerun](2026-09-29-pronunciation-batch-rerun.md) (added in #38), where 85 of 314 segments came back flagged for review with no pronunciation.

## Diagnosis

On 2026-09-29, a one-off Node script sent the six fully flagged batches again, exactly as the page batches them (the copied `parseTimedLyrics`, up to 12 lines and 3,000 characters), through `generatePronunciation` from `94c2afc` with a `ko` target.
It kept the provider result before validation and printed only counts; no lyric text, pronunciation, or key was printed or stored.
The batch counts per song (5, 7, and 4) matched the earlier rerun.

| Raw provider segments (6 batches)        | Count |
| ---------------------------------------- | ----- |
| `ja`, not flagged, pronunciation present | 16    |
| `ja`, flagged, pronunciation present     | 40    |
| `ja`, flagged, pronunciation null        | 11    |

After normalization, 51 segments had no pronunciation.
40 of them had a pronunciation from the model that the #31 normalization removed, because it nulled the pronunciation of every flagged segment.
The model's flags varied between calls: マリーゴールド batch 1 came back with no flag this time, and 白日 batch 2 with 8 of 12.
The 6 requests used 4,694 input and 3,756 output tokens.

## Change

A review flag now marks a pronunciation to check instead of removing it.
In `server/pronunciation.mjs` and in the page's `validatePronunciation`, a flagged foreign phrase may carry a non-blank pronunciation; `und` and target-language phrases still carry none, a blank pronunciation is rejected in strict mode and becomes null in normalize mode, and an unflagged foreign phrase still needs one.
The page shows a flagged pronunciation with the existing dotted-underline review style, and every row with a flagged lexical phrase shows a visible `발음 확인 필요` label, because touch WebViews show no tooltip.
The offline capture check and the edit-rate report call the server's `validateResult`, so they now accept the same flagged pronunciations the app saves.
The prompt is unchanged.

## Rerun

The same script then ran all 16 batches of the three songs through the changed server; all 16 requests succeeded and used 12,461 input and 9,797 output tokens.

| Song                        | Batches | Flagged segments | Flagged with pronunciation | Batches where every segment was flagged without pronunciation |
| --------------------------- | ------- | ---------------- | -------------------------- | ------------------------------------------------------------- |
| YOASOBI - 夜に駆ける        | 5       | 45 of 58         | 25                         | 2, 5                                                          |
| King Gnu - 白日             | 7       | 36 of 82         | 24                         | 3                                                             |
| あいみょん - マリーゴールド | 4       | 26 of 53         | 0                          | 3                                                             |

Of 193 segments, 49 flagged segments kept a pronunciation that the previous server would have removed, and 58 were flagged by the model with no pronunciation.
Four batches still have no pronunciation at all, because the model flagged every segment and returned none; the page shows their original lines with the `발음 확인 필요` label.
マリーゴールド batch 4 had 12 of its 15 segments flagged without pronunciation; the script did not record whether its other three segments carried one.
The issue's first completion condition, no fully flagged batch, is not met; the second, that the page tells the user why a block has no pronunciation, is met by that label.

## Limits

The remaining batches come from the model returning whole batches as flagged with no pronunciation, which the prompt's rule for ambiguous phrases allowed; the operator decided in #40 to replace that rule with a flagged most-likely pronunciation.
Model output varies between calls, so these counts describe one run each.
No native WebView run was made; the page behavior is covered by the Node tests.
