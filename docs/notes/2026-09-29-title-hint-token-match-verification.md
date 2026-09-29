# Song-title hint token matching verification

Issue: #33.
Follows [the #22 verification](2026-09-29-lyrics-title-hint-verification.md), whose substring rule this replaces.

## Change

Titles and queries are folded with NFKC and lowercasing; diacritics are removed only from Latin letters, so kana voicing marks and Devanagari vowel signs stay.
A title in a spaced script matches only when it equals a run of whole query words joined without punctuation or spaces, so `Love` is not found in `Lover` while `Don't` matches `dont` and `A.D.H.D` matches `ADHD`.
A title containing Han, Hiragana, Katakana, or Hangul still matches as a substring, because those scripts do not separate words with spaces.
The leading-article rule runs after width folding, so `Ｔｈｅ Song` is compared as `song`.
Bracketed presentation labels (video, audio, visualizer, lyrics, and MV variants) are no longer aliases.
A title equal to the artist counts only when it appears again after one occurrence of the artist is removed from the query.
The hint reads only the 20 displayed candidates and is recomputed when a refined video duration re-renders the list, but only while the status still shows one of the two candidate messages.

## Checks

Each row of the #33 table has its own page test in `tools/test-youtube.mjs`; all eight tests (seven rows, with the diacritics row split into kana and Devanagari) failed on the #32 rule with a status-message mismatch and pass after the change.
Two companion tests passed before and after: titles that differ only in punctuation or spacing (`Don't Stop Me Now`, `A.D.H.D`, `Mr. Blue Sky`, an artist-titled query that repeats the title, and an `(Official Video)` suffix), and a selected lyric keeping its status through a duration re-ranking.
The #32 album-title, matching, and short-artist-prefix tests pass unchanged.
`node --test tools/test-youtube.mjs server/pronunciation.test.mjs` passed 114 of 114 tests.

## Limits

The presentation labels are a fixed list; another label in brackets still counts as an alias.
A query that is only the artist's name shows the hint for a song titled after the artist, because the title does not appear apart from the artist.
Hangul titles still match as substrings even though Korean separates words with spaces, as #33 proposed.
No native WebView run was made; the page logic is covered by the Node tests.
