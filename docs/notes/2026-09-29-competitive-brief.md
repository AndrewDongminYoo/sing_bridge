# SingBridge competitive brief and minimum targets

Research date: 2026-09-29.
Scope: Korean-speaking users who want to sing Japanese songs, compared across direct apps, platform features, and substitutes.
Evidence basis: public store listings (KR storefronts where available), news articles, and the Play listing HTML fetched with `curl`; no competitor app was installed or used hands-on.
The [2026-09-27 product research](2026-09-27-product-risks.md) owns the earlier competitor table (LingoClip, LingoTube, Sounter, Musixmatch), the lyric-rights analysis, and decision gates 1–4; this note cites it rather than restating it.

## Where SingBridge stands

SingBridge plays a user-chosen YouTube video in the official player, lets the user pick LRCLIB lyrics, calibrates timing, and plays from a tapped line.
AI pronunciation (Japanese to Hangul or English), line editing, and local saving work only in development builds: the pronunciation server binds to `127.0.0.1` and README states that release support needs a separately approved HTTPS service.
Lyric rights remain unresolved and the licensing inquiry is unsent.
So a user outside the development machine cannot get the core pronunciation feature today.

## Competitive set

| Product                                        | Level                          | What it offers (source)                                                                                                                                                                                                                                                                                       | Signals                                                                                                                                                                                                                                                       |
| ---------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Utakoto (MINKYU KIM)                           | Direct                         | Play listing: add a Japanese song from YouTube and furigana, Hangul pronunciation, and sentence translation are prepared automatically; auto-generated vocabulary, SRS, flashcards, quizzes, JLPT levels. KR App Store: character-level synced karaoke mode, lyric-card sharing, kana/kanji writing practice. | Play: "100+ 다운로드", ads and in-app purchases, updated 2026-09-24. KR App Store: 5.0 from 2 ratings, v1.10.0 released about 2026-09-25, IAP ₩3,300–₩19,000. First release is listed as March 25; the year is `[UNCERTAIN]` (the KR page summary said 2025). |
| Apple Music                                    | Platform                       | iOS 26 added Lyrics Pronunciation (Japanese to romanized Japanese, Korean to Katakana, and others). At WWDC 2026 Apple announced iOS 27 pairings including **Japanese to Hangul** and English to Hangul. iOS 27 became public on 2026-09-14.                                                                  | Whether Japanese to Hangul shipped in the public release, its KR availability, and its song coverage are `[UNCERTAIN]`; Apple says availability varies by song and region. Android availability of pronunciation is `[UNKNOWN]`.                              |
| 한음 일본어 (Jamin Ku)                         | Adjacent (learning)            | Structured J-pop roadmap with listen-and-tap, sentence building, kanji reading, review; v7.0 (2024-08) added Hangul pronunciation and meaning to sentence exercises.                                                                                                                                          | KR App Store: 4.7 from 35 ratings, free.                                                                                                                                                                                                                      |
| LingoClip / LyricsTraining                     | Adjacent (learning)            | YouTube-based lyric games and a karaoke mode; Japanese is offered as romaji.                                                                                                                                                                                                                                  | Free tier limited to three games per day; Premium price not established.                                                                                                                                                                                      |
| Spotify                                        | Platform (absent)              | No native romanized lyrics; long-standing community requests, filled by third-party browser extensions (Moegi, Kashi, Spotify Karaoke).                                                                                                                                                                       | Demand signal, not a Korean-Hangul signal.                                                                                                                                                                                                                    |
| YouTube "가사 발음" videos and playlists       | Substitute                     | Uploader-made videos with Japanese lyrics and Hangul pronunciation.                                                                                                                                                                                                                                           | Free and already where the song is; quality and sync vary per uploader.                                                                                                                                                                                       |
| General AI chat, blogs, paid human translation | Substitute                     | Ask for Hangul pronunciation in a chat assistant; blog/Postype transcriptions; paid J-pop lyric translation gigs on Kmong.                                                                                                                                                                                    | Text only, no playback sync.                                                                                                                                                                                                                                  |
| TJ karaoke                                     | Substitute (performance venue) | Japanese songs can be searched by Hangul reading; secondary sources (namu.wiki) say Japanese songs show Hangul readings except when the score display is on.                                                                                                                                                  | Where the singing actually happens; no rehearsal loop. Display claims are secondary-source only.                                                                                                                                                              |

## Feature comparison

Ratings: Strong, Adequate, Weak, Absent, or "not established" when a listing does not say.
SingBridge is rated on what an end user can use today, not on development builds.

| Capability                                                | SingBridge                                       | Utakoto                                             | Apple Music (iOS 27)              | YouTube pronunciation videos       |
| --------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------- | --------------------------------- | ---------------------------------- |
| Hangul pronunciation for any Japanese song the user picks | Absent for users (dev-only)                      | Strong (claimed, automatic)                         | `[UNCERTAIN]`, catalog songs only | Weak (only songs someone uploaded) |
| Official recording plays in sync                          | Adequate (YouTube + LRCLIB + manual calibration) | Adequate (YouTube, character-level karaoke claimed) | Strong (licensed catalog)         | Adequate (video itself)            |
| Line repeat / play from a tapped line                     | Strong                                           | not established                                     | not established                   | Absent                             |
| User correction of pronunciation                          | Strong (dev-only edit and save)                  | not established                                     | Absent                            | Absent                             |
| Vocabulary / JLPT study                                   | Absent                                           | Strong                                              | Absent                            | Absent                             |
| Licensed lyrics                                           | Absent (LRCLIB, rights unresolved)               | not established                                     | Strong                            | not established                    |
| Cost to user                                              | Free, no account                                 | Free with ads; ₩3,300–₩19,000 IAP                   | Subscription                      | Free                               |

## Positioning

- **Utakoto** claims "learn Japanese through J-POP": the category is language study, with singing as the hook.
- **Apple Music** treats pronunciation as a free add-on for subscribers across many language pairs.
- **YouTube videos** own the free, zero-install habit.
- **Unclaimed position:** a rehearsal tool whose job is "sing this song correctly at karaoke or along with the recording," judged by whether the pronunciation matches how the song is actually sung (long vowels, sung readings, particles), with per-line correction and repeat. Nobody verified here makes accuracy of the sung reading or rehearsal their claim.
- **Crowded position:** "automatic Hangul pronunciation" alone is now table stakes: Utakoto claims it, and Apple has announced it.

## Opportunities

1. Sung-reading accuracy is a differentiator only if measured; `tools/pronunciation-quality` exists, but its 12 synthetic cases are explicitly not AI accuracy ([reference verification](2026-09-29-pronunciation-reference-verification.md)).
2. Rehearsal mechanics (line repeat, tap-to-play, timing calibration, editable pronunciation) are already built and not established in any competitor listing.
3. Songs outside a streaming catalog (anime, Vocaloid, covers on YouTube) are reachable through YouTube but not through Apple Music's catalog.

## Threats

1. **Apple Music Japanese to Hangul** removes the "no one shows Hangul for J-pop" gap for iPhone subscribers, with licensed lyrics and no setup.
2. **Utakoto** targets the same user with the same YouTube-based source, ships frequently (v1.10.0 by late September), and already monetizes.
3. **Release blockers are ours, not competitors'**: no production pronunciation service, unresolved lyric rights, and a client-side YouTube key needing restrictions. A competitor does not need to move for SingBridge to stall.
4. **Nightmare scenario:** Apple ships accurate Japanese to Hangul broadly and adds line repeat, making a separate app unnecessary for iPhone users.

## Strategic implications

- **Parity to reach before any public release:** Hangul pronunciation that a non-developer user can get. This depends on decision gate 1 (rights) and a production pronunciation path in the [2026-09-27 research](2026-09-27-product-risks.md#decision-gates).
- **Differentiate on:** measured sung-reading accuracy plus the rehearsal loop (repeat, tap-to-play, correction).
- **Deprioritize:** vocabulary, JLPT, SRS, writing practice (Utakoto's category), accounts, sharing.
- **Monitor:** Apple Music Japanese to Hangul availability in KR and on Android; Utakoto release notes and Play download band; LRCLIB coverage of the curated song list.

## Product context

The operator confirmed the target user and key metric on 2026-09-29, choosing singing practice over language study and over a personal-tool scope.
No previous project fixed numeric targets, so every threshold below is a new proposal, not a benchmark.

- **Target user:** Korean speakers who cannot read Japanese and want to sing a specific Japanese song correctly, for karaoke or singing along.
- **Key metric:** songs a tester sings through to the end with SingBridge pronunciation in a week, counted in moderated sessions or tester self-report; the app has no telemetry and none is proposed.
- **Non-goals:** language study features, accounts, sharing, and a production backend before rights clearance.

## Proposed minimum targets

Each target states how it can be measured without adding analytics.

### Gate A: before inviting testers

| Target                 | Proposed threshold                                                                                                                        | How to measure                                                              |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Lyric availability     | Synced LRCLIB lyrics for at least 70% of a curated 30-song list of Japanese songs popular in Korea, with false matches counted separately | Manual run of decision gate 3                                               |
| Pronunciation accuracy | A fluent reviewer leaves at least 90% of lines unedited across 10 songs                                                                   | Reviewer edits in the existing edit flow, on authorized or original samples |
| Time to first sing     | Under 60 seconds from app open to singing a matched song                                                                                  | Stopwatch on Android and iOS devices                                        |
| Cost per song          | Measured and recorded per song for the pinned model                                                                                       | Server-side token counts from test runs                                     |

The accuracy threshold has no baseline yet; the first real measurement may move it.

### Gate B: closed test with 10 testers for 2 weeks

| Target     | Proposed threshold                                                                                        | Kill or pivot signal                       |
| ---------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Key metric | Median of at least 2 songs sung through per tester per week                                               | Median below 1 in week 2                   |
| Return     | At least 5 of 10 testers use it again in week 2 without a reminder                                        | 3 or fewer                                 |
| Preference | At least 5 of 10 prefer it over their current method (YouTube pronunciation videos, Utakoto, Apple Music) | Most prefer an existing method; record why |

Public release stays behind decision gates 1 and 4 of the earlier research regardless of these results.

## Sources

Accessed 2026-09-29.

- [Utakoto, Google Play (KR)](https://play.google.com/store/apps/details?id=space.utakoto.app&hl=ko&gl=KR) and [App Store (KR)](https://apps.apple.com/kr/app/id6760290605)
- [한음 일본어, App Store (KR)](https://apps.apple.com/kr/app/id1588321599)
- [Digital Music News, iOS 27 Apple Music, 2026-06-09](https://www.digitalmusicnews.com/2026/06/09/apple-music-gets-a-huge-update-in-ios-27-with-siri-ai/)
- [AppleInsider, iOS 27 arrives 2026-09-14](https://appleinsider.com/articles/26/09/09/ios-27-arrives-on-september-14-heres-what-youll-get)
- [시사저널e, Apple Music J-pop Hangul plan, 2025-10-16](https://www.sisajournal-e.com/news/articleView.html?idxno=416053)
- [Apple Support, lyrics translation and pronunciation](https://support.apple.com/en-us/105076)
- [TechCrunch, iOS 26 lyrics translation and pronunciation](https://techcrunch.com/2025/06/09/apple-music-adds-lyrics-translation-and-pronunciation-features-in-ios-26/)
- [LyricsTraining Japanese (romaji)](https://lyricstraining.com/ja/) and [LingoClip](https://lingoclip.com/)
- [Spotify Community, romanized lyrics request](https://community.spotify.com/t5/Live-Ideas/All-Platforms-Other-Romanized-Lyrics-for-Songs-Not-In-Latin/idi-p/5000880) and [Moegi extension](https://github.com/sglkc/moegi)
- [Kmong, J-pop lyric translation gig](https://kmong.com/gig/498279)
- [namu.wiki, TJ Media](https://namu.wiki/w/TJ%EB%AF%B8%EB%94%94%EC%96%B4) (secondary source)
