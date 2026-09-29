# Candidate song list for the LRCLIB coverage gate

<!-- cspell:words aespa Bansanka BOYNEXTDOOR Sasuke -->

Issue: #19.
The list is `tools/lyrics-coverage/songs-2026-09.json`; this note records how it was chosen, so the list is not repeated here.
It is a candidate for the operator's approval: the Gate A lyric-availability run in the [competitive brief](2026-09-29-competitive-brief.md) uses it only after approval, and the operator may replace any entry.

## Sources

- **Popularity in Korea:** the Melon J-POP monthly chart for 2026.08 (`https://www.melon.com/chart/month/index.htm?classCd=GN1900`), read on 2026-09-29 from the page HTML, 100 ranks.
  The Bugs J-POP daily chart for 2026-09-28 (`https://music.bugs.co.kr/chart/track/day/njpop`), read the same day from the page HTML, is a cross-check: all 20 titles in its top 20 are in the list.
- **Names and durations:** the iTunes Search API for the Japan store (`https://itunes.apple.com/search?country=jp&entity=song`), queried on 2026-09-29 with the charted artist and title.
  The chart shows romanized titles, while LRCLIB records use the original names, so the list uses the store's artist and title.
- **Video durations:** the YouTube Data API with the app's search parameters (`YouTubeSearch.kt`: relevance order, embeddable, syndicated, one result) and the query a user types, `<artist> - <title>`, then `videos.list` for the duration, on 2026-09-29.
  The 30 searches and lookups used about 3,030 units of the operator's daily YouTube quota and no paid API.

Only metadata was read; no lyric text was requested or stored.

## Selection rules

1. Take the chart in rank order until 30 songs remain.
2. Skip Japanese-language releases by Korean groups, because the target user wants Japanese songs: NewJeans (ranks 7 and 40), aespa (8), NCT WISH (10 and 18), Hearts2Hearts (17), TWS (26), and BOYNEXTDOOR (37).
3. Count a song once; Pretender also appears at rank 27.
4. Skip a song that the Japan store does not list under the charted artist: M.Sasuke - GG EZ (rank 3) returned only other songs by the artist.

The 30 songs span ranks 1 to 39; `melonRank` in the list keeps each rank.
The next eligible song, kept as a reserve, is KANA-BOON - シルエット (rank 41, 242 seconds in the store).

## Normalization

- The store's first result is used, except for SPYAIR, whose first result for the charted title was another song (オレンジ); the list uses サムライハート(Some Like It Hot!!), the second result.
- `『』` is removed from the artist ユイカ, and the romanization is removed from `晩餐歌 - Bansanka`, because the coverage tool sends artist and title as the LRCLIB query.
- Store spacing is kept as listed, for example `松田 聖子` and `冨岡 愛`.

## Durations

`durationSeconds` is the length of the first video the app shows for the song, because the app matches LRCLIB records to the video it plays; `videoId` records that video and `storeSeconds` the store's track length.
The two lengths differ by more than the tool's 2-second match window for 21 of the 30 songs, mostly because music videos run longer than the track.

For most songs the first video is the artist's or label's official upload.
Two are not the original recording, and the operator should decide whether to keep them as measured or replace the entry:

- W / X / Y (rank 31): the first video is a fan-made lyric translation video of a collaboration version, 189 seconds against 279 in the store.
- うたたね (rank 39): the first video is a live recording, 205 seconds against 181 in the store.

Search results change over time, so a later run may see different first videos.

## Next step

After approval, run the tool on this list as its README describes and record the result, with false matches listed separately from missing lyrics, in a new dated note.
