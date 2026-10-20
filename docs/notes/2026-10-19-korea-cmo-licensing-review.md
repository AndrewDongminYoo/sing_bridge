# Korean collecting society licensing review

Issue: #17.
Review date: 2026-10-19.
This is decision support from public sources, not a legal opinion or a record of contact with any collecting society.

## Scope change under review

On 2026-10-19 the operator proposed narrowing the target to Korean speakers who want to sing Japanese songs, released in South Korea only.
The question was whether the LRCLIB-based code can ship under that scope, and, if not, whether agreements with KOMCA and KOSCAP are the right path.

## Verdict

The current LRCLIB-based flow cannot ship under the narrowed scope.
Narrowing to one territory reduces the governing law to Korean law and makes a collecting society route possible, but it does not supply the missing rights.
A collecting society agreement is likely to cover only part of what the app does; see [Gaps](#gaps-a-society-agreement-may-not-close).

## What the code does with lyrics

| Feature              | Behavior                                                                                                                                               | Rights exposure                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lyric search/display | The page calls `https://lrclib.net/api/search` and `/api/get/{id}` directly and shows full synchronized lyrics (`YouTubeLyrics.kt`).                   | The operator provides lyrics to the public; being free or used by individuals does not exempt it, since Copyright Act Article 30 covers the user's own copying. |
| Pronunciation        | Lyric lines go through the server to OpenAI with `store: false` ([hosted pronunciation](../specs/2026-09-29-hosted-pronunciation.md)).                 | Reproduction and processing by a provider outside Korea; the output is a Hangul rendering of the whole lyric.                                                   |
| Saved practice       | Stores the source snapshot, pronunciation layer, and line edits on the device ([pronunciation editing](../specs/2026-09-28-pronunciation-editing.md)). | On-device reproduction of lyric text.                                                                                                                           |
| Practice sharing     | Shares only video ID, LRCLIB ID, and offset ([practice sharing](../specs/2026-09-30-practice-sharing.md)).                                             | Low; no lyric text leaves the device.                                                                                                                           |

The README said the saved-practice feature stores no lyric body; the code contradicts it, and the README was corrected on 2026-10-19.
`storablePronunciation()` in `YouTubeLibrary.kt` saves `pronunciationSnapshot()` from `YouTubePronunciation.kt`, whose `source` field holds every lyric line's time and text, and whose generated segments repeat the source text.
A saved practice can hold a layer for each reading language (`ko`, `en`), so it can keep several full copies of the lyrics; a practice saved without pronunciation stores no lyric text.
For rights purposes, saving with pronunciation is an on-device reproduction of the full lyric.

LRCLIB gives no basis for commercial rights: its MIT license covers the server code, its records are contributed by users, its API has a `/api/flag` endpoint for copyright reports, and the [commercial use issue #111](https://github.com/tranxuanthang/lrclib/issues/111) is still open.

## Which society administers Japanese songs in Korea

Copyright applies where the use happens, so showing lyrics to users in Korea is a use in Korea, licensed by Korean societies on behalf of Japanese ones.

- **JASRAC works:** KOMCA administers them in Korea under the reciprocal agreement in force since 2008-01-01 ([JASRAC 2008 statement](https://www.jasrac.or.jp/ejhp/release/2008/0123.html)).
  The JASRAC–KOSCAP agreement from 2025-01-01 is one-way: JASRAC administers KOSCAP works in Japan, and KOMCA keeps JASRAC works in Korea ([JASRAC notice](https://www.jasrac.or.jp/information/topics/25/250106.html)).
- **NexTone works:** NexTone's note of 2026-05-08 says it has collected Korean royalties through KOSCAP since July 2025 ([NexTone note](https://note.com/nextone_corp/n/n04578c4aff2a)); it does not say whether KOSCAP also licenses.

Under the narrowed scope, KOSCAP is needed only for NexTone repertoire; Korean songs no longer justify it.

## Gaps a society agreement may not close

1. **Lyric display of Japanese works may be reserved.**
   KOMCA FAQ item 38 states that the KOMCA–JASRAC agreement reserves publishing on both sides and directs Japanese print uses to JASRAC ([KOMCA FAQ](https://www.komca.or.kr/CTLJSP?EVENTID=info_05_list&MENUID=1000005023005&SYSID=PATHFINDER&S_PAGENUMBER=1&S_ROWS=100&S_TTCON=)).
   On-screen lyric text is close to a print use; whether KOMCA classifies it as publishing (tariff Article 36) or transmission decides whether JASRAC works need a direct agreement in Japan.
   The KOMCA tariff articles seen in this review (transmission Articles 23 to 27 and the fee table) include no article for lyric text display alone, so a negotiated rate is likely.
2. **Pronunciation and AI processing are outside entrusted rights.**
   KOMCA FAQ items 40 and 53 say adaptation rights and the right of integrity are not entrusted to the society; the author or publisher grants them.
   For foreign works, item 30 directs requests to the Korean sub-publisher shown as SE in the work search, or to the original right holder when there is none.
   Whether a Hangul transliteration is reproduction or a derivative work is undecided, and sending lyrics to OpenAI is unlikely to fall under a society license.
3. **Coverage varies per work.**
   KOMCA FAQ item 29 says reproduction rights of foreign works often show as not administered unless a Korean sub-publisher is registered, and JASRAC lets right holders choose which rights to entrust.
   Coverage has to be checked work by work.
4. **A society licenses rights, not lyric text.**
   Even with a license, the app still needs a lyric source; continuing to use LRCLIB records and their contributed timing would need its own review, including database rights.
5. **Japan storefronts.**
   Showing lyrics to users in Japan would be a use in Japan and need JASRAC or NexTone directly; a Korea-only release avoids this.

## Who licenses what on the society route

The operator set this working split on 2026-10-19; each row still needs the society's written confirmation.

| Use                                 | Licensor                                                                       | Open question                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Lyric display, Korean works         | KOMCA                                                                          | Classification and rate; it also covers foreign works registered through a Korean sub-publisher. |
| Lyric display, JASRAC works         | JASRAC if KOMCA treats display as the reserved publishing use; KOMCA otherwise | Which of the two applies.                                                                        |
| Lyric display, NexTone works        | KOSCAP or NexTone                                                              | Which one holds authority to license display in Korea.                                           |
| Hangul transliteration, AI handling | The work's right holders, typically its publisher, per work                    | Whether consent is needed at all, and on what terms.                                             |

### Preferred target: JASRAC and NexTone only

The operator's preferred outcome is to close display rights with JASRAC and NexTone alone.
It holds only if all of these are confirmed in writing:

1. JASRAC licenses lyric display in Korea directly for its works, because the use falls under the publishing reservation in KOMCA FAQ item 38.
2. NexTone licenses lyric display in Korea directly, rather than leaving it to KOSCAP.
3. The target songs are not registered with KOMCA through a Korean sub-publisher (SE); a registered song would also need KOMCA.
4. The target songs are entrusted to JASRAC or NexTone for this use; songs outside both need their publishers directly.

Condition 1 may not hold: for publishing a songbook of JASRAC works abroad, JASRAC's FAQ says few foreign societies handle print rights, so permission comes from the right holders, though JASRAC can license some cases ([JASRAC FAQ, international network](https://secure.okbiz.jp/faq-jasrac/category/show/229?site_domain=jp), accessed 2026-10-19).
If lyric display is treated the same way, JASRAC works would need their publishers rather than JASRAC.
The [JASRAC and NexTone inquiry](2026-10-19-japan-society-inquiry.md) asks both points.

Even then, transliteration consent stays per work with the right holders, outside both societies.
Collecting societies in Japan, as in Korea, do not normally administer adaptation rights or moral rights, so the same per-work question applies; this review did not confirm JASRAC's or NexTone's policy on it.

## Commercial vendor status

The operator reported the following on 2026-10-19; see the [replies note](2026-10-01-lyrics-license-replies.md#update-2026-10-19) for the record.

- **LyricFind:** stated USD 600 per month as the minimum payment for a catalog that excludes the major publishers, among them Universal and Sony.
  It will research the detailed scope, including AI use, once SingBridge states a workable budget.
- **Musixmatch:** proposed only a price similar to LyricFind's figure with the major publishers included; no meeting took place.

The operator judges both too expensive for this scope: both are priced for broad catalog coverage, while the target is a narrow set of Japanese songs popular in Korea.
At the LyricFind minimum, that is at least USD 7,200 per year before any AI scope is priced.
On 2026-10-20 Andrew told LyricFind in writing that the budget in the first months after launch will be well below USD 600 per month, and asked for a smaller, usage-based, or ramped option despite the stated minimum ([follow-up](2026-10-01-lyrics-license-replies.md#lyricfind-follow-up-2026-10-20)).

## Options

| Option                                       | Cost signal                                 | What it leaves open                                                                                    |
| -------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| LyricFind without major publishers           | USD 600/month minimum quoted                | How much Japanese repertoire remains after the exclusion; AI and transliteration scope still unpriced. |
| JASRAC and NexTone (preferred)               | Unknown; inquiries sent, no answer yet      | The four conditions above, per-work transliteration consent, and a lyric source.                       |
| KOMCA, KOSCAP, and JASRAC as split above     | Negotiated; no lyric-display tariff found   | Which society holds each work, per-work transliteration consent, and a lyric source.                   |
| User-supplied lyrics only (local LRC import) | No licensing fee for operator-provided text | Weaker experience; sending user-supplied lyrics to OpenAI still needs review.                          |

## LyricFind as a bundle against the society route

On 2026-10-20 the operator reframed the LyricFind minimum.
On the society route, display rights split across KOMCA, JASRAC, and KOSCAP or NexTone, as the [split above](#who-licenses-what-on-the-society-route) shows, and transliteration can need consent per work from its right holders.
So the USD 600 monthly minimum is worth judging as the cost of one contract that bundles these pieces, not only as a catalog price.

### What LyricFind supplies that the society route does not

- **Lyric text and synchronized timing.**
  A society licenses the use only, so the society route still needs a lyric source ([gap 4](#gaps-a-society-agreement-may-not-close)).
  This difference holds whatever LyricFind answers.
- **One contract and one contact.**
  The society route can need separate agreements with up to three societies, plus per-work requests to publishers.
  For an independent developer, that negotiation effort can cost more than the difference in fees.

### What decides the value of the bundle

The [2026-10-20 follow-up](2026-10-01-lyrics-license-replies.md#lyricfind-follow-up-2026-10-20) asks each point:

1. **Japanese repertoire after the exclusion** (questions 1 and 3).
   If the exclusion removes the Japanese affiliates of the major publishers, such as Sony Music Publishing Japan, many top Japanese songs on Melon can fall outside the catalog.
   The per-song answer for the 30-song list gives a cost per covered song.
2. **Display rights in Korea for Japanese publishers** (question 2).
   LyricFind must hold the right to show these works to users in South Korea.
3. **Transliteration and AI processing** (question 4).
   This is the hardest piece on the society route.
   LyricFind said it would research AI scope separately, so the base tier may exclude it.

### How to read the answer

- **Points 1 to 3 all hold:** the minimum buys display rights, lyric data, and transliteration consent in one contract.
  Compare it with the society route's fees plus its negotiation effort and a separate lyric source; the bundle is likely the better route.
- **Transliteration is excluded:** the minimum buys display rights and lyric data only.
  Transliteration consent then stays a per-work task on every route, so compare the two routes on display rights and lyric data alone.
- **Little Japanese repertoire remains after the exclusion:** use the cost per covered song; the society route is likely better for the remaining songs.
- **LyricFind declines any option below the minimum:** record the answer.
  It settles the vendor route at this budget, and the society route continues.

The request has value even if LyricFind declines it.
It replaces the silence after the 2026-10-08 call with a pending written request, and the stated budget tests whether LyricFind will take a customer of this size.

## Next steps

1. Measure what a major-publisher exclusion removes: map the [curated 30-song list](2026-09-29-lyrics-coverage-song-list.md) to publishers through the JASRAC and NexTone work databases and the KOMCA work search (SE field), and count songs whose publishers are Universal or Sony affiliates.
   That count turns the LyricFind offer into a cost per covered song instead of a catalog-wide price.
2. LyricFind was asked in writing on 2026-10-20 which entities the exclusion covers, whether its catalog licenses Japanese publishers for display in Korea, and which of the 30 songs it covers; record its answer in the [replies note](2026-10-01-lyrics-license-replies.md#lyricfind-follow-up-2026-10-20).
3. JASRAC and NexTone were asked first, since they decide whether the preferred target holds (sent 2026-10-19 and 2026-10-20; see the [inquiry note](2026-10-19-japan-society-inquiry.md)); send KOMCA and KOSCAP the questions below for whatever their answers leave open.
4. For the 30-song list, record each song's society (JASRAC or NexTone) and any Korean sub-publisher, so the inquiries can name real works.
5. Keep the user-supplied lyrics path as the fallback release scope while answers are pending.

## Questions for JASRAC and NexTone

- Whether you license in-app lyric text display, synchronized with playback, to users in South Korea directly, or whether a Korean society (KOMCA or KOSCAP) does under your agreement.
- If you do: the applicable tariff or negotiated rate, reporting duties, and whether on-device storage for offline practice is covered.
- How to check per work whether it is entrusted to you for this use.
- Whether a Hangul transliteration shown with the original needs consent from the work's right holders, and how to reach them.
- Whether sending lyric lines to a third-party AI service to generate the transliteration is within any license you grant.

## Questions for KOMCA and KOSCAP

- Whether in-app lyric text display synchronized with playback counts as publishing, transmission, or karaoke, and which tariff or negotiated rate applies.
- Whether lyric display of JASRAC (KOMCA) or NexTone (KOSCAP) works falls within the reciprocal agreement, or under the publishing reservation.
- How to check per work whether a Japanese work is administered for this use, including the SE field and entrusted rights.
- Whether Hangul transliteration and third-party AI processing need author or publisher consent, and whom to contact.
- Whether on-device storage for offline practice is covered, and what usage reporting applies.
- Terms for a release limited to Korean storefronts.
