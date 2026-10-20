# Lyrics licensing replies

Issue: #17.
Follows the [inquiry sent on 2026-09-30](2026-09-30-lyrics-license-inquiry.md).
Times are read from Gmail and given in UTC.

## Status

Neither vendor has answered the licensing questions yet: no confirmation, terms, or price.
Musixmatch routed the inquiry to review, and LyricFind asked for a call.
Until the vendors answer, LRCLIB access still does not establish commercial rights, and the Gate A sample condition stays open, as decided on #21.

## Musixmatch

- **2026-09-30T12:02:36Z, reply** from Musixmatch API support (`apisupport@musixmatch.com`): the questions need review by the commercial and legal team before anything is put in writing, and Musixmatch asked for the expected catalog size and target launch markets to route the inquiry.
- **2026-10-01T00:25:43Z, Andrew's answer:**
  - The initial target market is South Korea, for Korean speakers who cannot read Japanese; Japan and the United States were in the first email for price comparison only.
  - The focus is Japanese songs popular in South Korea, with lyrics retrieved per song on demand when a user searches, not bulk catalog delivery.
  - 30 songs have been used for testing; that is a test sample, not a forecast or a limit, and the 1,000 and 10,000 MAU figures were illustrative scenarios, not forecasts.
  - He asked how Musixmatch defines catalog size for an on-demand model and what usage estimate the commercial team needs, and asked the team to review the licensing questions of the first email.

## LyricFind

- **2026-09-30T13:57:27Z, reply** from a LyricFind account executive, sent at 09:57 in UTC-4: a proposal for a 20-minute Google Meet this week or next, to understand the requirements and suggest a licensing plan.
- **2026-10-01T00:25:49Z, Andrew's answer:**
  - He accepted the call and asked for a time this week or next between 10:00 and 22:00 KST.
  - He gave the same market and on-demand retrieval summary as to Musixmatch.
  - He asked to discuss a plan covering synchronized lyrics, phonetic transliteration, third-party LLM processing, and offline storage, with pricing and minimum fees.

## Update 2026-10-19

Reported by Andrew on 2026-10-19.
A call with LyricFind took place on 2026-10-08, per #17; whether the offer below came on that call or in a later message, and the date of the Musixmatch proposal, were not recorded here.

- **LyricFind:** offered support up to USD 600 per month, assuming the major publishers Andrew named as Universal and Sony are excluded; the exact excluded entities need written confirmation.
  LyricFind will research the detailed scope, including AI use, once SingBridge states a workable budget.
- **Musixmatch:** proposed only a price similar to LyricFind's figure with the major publishers included; no meeting took place.
- Andrew judges both too expensive for a Japanese-song scope; the [Korean collecting society review](2026-10-19-korea-cmo-licensing-review.md) compares the options.

Neither vendor has yet confirmed in writing the transliteration, AI-processing, or offline-storage scope.

## LyricFind follow-up 2026-10-20

Andrew emailed the LyricFind account executive at about 2026-10-20T15:07Z (00:07 KST on 2026-10-21), as he reported, with the English 30-song list attached as CSV.
The CSV holds the songs of `tools/lyrics-coverage/songs-2026-09.json` with title, artist, and Melon J-POP rank, and empty columns for LyricFind to fill: in catalog, publishers, licensable in South Korea at the USD 600 tier, licensable with the majors included, and synchronized lyrics available.

The message describes the offer as pricing that **starts at** USD 600 per month for a catalog without the major publishers.
The 2026-10-19 update above records it as support **up to** USD 600 per month.
LyricFind's written answer should settle whether USD 600 is a floor or a ceiling.

What the message states:

- Scope: South Korea only, Japanese songs popular in Korea, retrieved one song at a time on user selection, with no bulk delivery.
- Planned pricing: a monthly subscription of KRW 4,900 with no advertising.
- SingBridge is also reviewing licensing through collecting societies to compare routes; the societies are not named.
- **Budget signal:** in the first months after launch the budget will be well below USD 600 per month, so a usage-based or ramped option would make the decision easier.
  This is the first budget statement given to a vendor.

Questions, summarized:

1. Which entities the major-publisher exclusion covers, including the Japanese affiliates of Universal Music Publishing, Sony Music Publishing, and Warner Chappell Music and works they sub-publish in Korea, and the monthly price with the majors included.
2. Whether the catalog includes rights from Japanese publishers for lyric display to users in South Korea, and whether through direct publisher deals or a collecting society.
3. Per song in the attached list: in catalog, licensable at the USD 600 tier, licensable with the majors, synchronized lyrics available; or, failing that, the approximate share of Japanese-publisher works in the Korea catalog.
4. Which uses the USD 600 tier includes and which need separate pricing: synchronized display with seeking and line repeat, Hangul transliteration, sending lyric lines to the OpenAI API without training use, and on-device storage when a user saves a practice; plus attribution, caching, and reporting requirements, especially limits on on-device retention.
5. Whether a tier limited to Japanese repertoire or a selected song list exists, priced per song or per usage, or a revenue share with a lower minimum in the first months.
6. The minimum contract term and any setup fees.

## Next

- Record LyricFind's answer to the 2026-10-20 follow-up, including whether USD 600 is a floor or a ceiling.
- Record Musixmatch's written terms if they arrive.
- Keep #17 open until each vendor has answered the licensing questions or this note records that no answer arrived.
