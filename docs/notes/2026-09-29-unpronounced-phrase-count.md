# Counting phrases saved without pronunciation

Issue: #43.

## Decision

Since #40, the prompt asks for a pronunciation for every supported phrase outside the target language, but only the prompt enforces it.
When the model returns such a phrase with a null or blank pronunciation, the server normalizes it to `pronunciation: null` with `needsReview: true`, and the page shows its source with the `음차 확인 필요` label.
In the #41 paid rerun this happened for 0 of 190 segments.

On 2026-09-29, Andrew chose to keep this behavior and to count these phrases in the edit-rate report (#21), and to decide on a server retry later from that count.
Rejecting the batch stays out, because it would bring back the #29 failures.

## Change

`tools/pronunciation-quality/edit-rate.mjs` reports `unpronouncedSegments` for each layer and in each reviewed target total.
A segment counts when its language is neither the target nor `und`, its pronunciation is null, and its source contains a letter, which is the rule the page uses for the review label.
The server, the page, and the app are unchanged.

## Checks

| Command                                         | Result                    |
| ----------------------------------------------- | ------------------------- |
| `npm test --prefix tools/pronunciation-quality` | 37 tests, 37 pass, exit 0 |

The new test failed before the change on the missing field.
With the letter rule removed, the test failed on the punctuation-only phrase, so it checks that exclusion.
No paid request was made, and no saved library was read.
