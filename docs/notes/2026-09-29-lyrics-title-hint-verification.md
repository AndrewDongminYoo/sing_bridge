# Lyrics song-title hint verification

Issue: #22.

## Change

After a lyric search returns candidates, the page checks whether any candidate's title appears in the search terms.
Each candidate yields title variants: the full title, the title without bracketed text, each bracketed alias, and each part around a spaced dash, with a leading English article removed. Variants are compared after NFKC normalization, lowercasing, and removal of punctuation, symbols, and spaces; a variant contained in the artist field does not count, and a Latin variant of one or two characters must equal a whole search word.
When no title appears, the status suggests searching by song title instead of an album or video title.
Ranking, focus handling, and the candidate list are unchanged, and saved-practice restoration does not use this check.

## Checks

The new album-title test failed before the change and passes after it; the companion test, which covers a hyphenated romanized suffix, a bracketed suffix, full-width letters, and a hyphenated query, passed before and after, guarding against false hints.
Hosted review on PR #32 found three gaps in the first rule: a short title such as `I` matched inside unrelated words, a collaborator artist field let the artist prefix count as a title, and removing brackets dropped aliases such as `Escape (The Piña Colada Song)`. The tests gained those three cases, both failed on the first rule, and the rule above replaced it.
`node --test tools/test-youtube.mjs server/pronunciation.test.mjs` passed 102 of 102 tests, and `./gradlew :shared:jvmTest` passed, compiling the Kotlin raw string.
Applied to the LRCLIB responses saved from the 2026-09-29 metadata probe, the check found no matching title among the 20 candidates for `BAD BUNNY DeBÍ TiRAR MáS FOToS` (an album title) and found one for `Bad Bunny DtMF`.

## Limits

A song whose title equals its artist's name never counts as a match, so it shows the hint.
The check reads titles only; it does not confirm the recording, which remains the user's choice.
No native WebView run was made; the page logic is covered by the Node tests.
