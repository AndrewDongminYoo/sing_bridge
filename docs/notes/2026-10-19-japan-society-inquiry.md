# JASRAC and NexTone lyric display inquiry

Issue: #17.
Follows the [Korean collecting society review](2026-10-19-korea-cmo-licensing-review.md), whose preferred target is to close lyric display rights with JASRAC and NexTone alone.

## Status

Andrew prepared both messages on 2026-10-19; this note records what he reported, not a delivery receipt.

| Society | Route                                                                                                  | Sent                                                                                  |
| ------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| JASRAC  | Email to the publishing section, `shuppan-contact@jasrac.or.jp`, with the 30-song list as CSV          | 2026-10-20 09:00 KST, scheduled send; Andrew confirmed it in the Sent folder that day |
| NexTone | [Inquiry form](https://www.nex-tone.co.jp/inquiry/), category 「インターネット上での音楽利用について」 | 2026-10-19 23:00 KST, as Andrew reported; the form takes no attachment                |

As of 2026-10-20 23:57 KST, neither society has replied, as Andrew reported.
Record any answers in this note.

## Why these routes

- JASRAC licenses uses in Japan in principle and leaves uses abroad to each country's society ([JASRAC FAQ 243](https://secure.okbiz.jp/faq-jasrac/faq/show/243?category_id=205&site_domain=jp)).
  For publishing a songbook of JASRAC works abroad, its FAQ says few foreign societies handle print rights, so permission comes from the right holders, though JASRAC can license some cases, and names the publishing section as the contact ([JASRAC FAQ, international network](https://secure.okbiz.jp/faq-jasrac/category/show/229?site_domain=jp)).
- NexTone's FAQ lists both Japan and foreign territories as administered, and directs new services without an applicable tariff to the inquiry form ([NexTone FAQ](https://www.nex-tone.co.jp/copyright/faq.html)).
  NexTone's own note of 2026-05-08 says it has collected Korean royalties through KOSCAP since July 2025, without saying whether KOSCAP also licenses ([NexTone note](https://note.com/nextone_corp/n/n04578c4aff2a)).
  Foreign territories are entrusted to NexTone in two categories, 「演奏権等」 and 「録音権等および出版権等」 ([NexTone note on foreign territories](https://note.com/nextone_corp/n/nf7fba295fb7c)).

All pages accessed 2026-10-19.

## What both messages state

- Korean storefronts only, users in Korea; YouTube embedded playback with no audio held or delivered by SingBridge.
- Synchronized original lyrics, a Hangul transliteration under each line, one song at a time on user request, and on-device saving of original and transliteration only when the user saves.
- **Planned pricing:** a monthly subscription of 4,900 KRW with no advertising. This is a new product decision recorded here for the first time.
- No user forecast; both ask how fees would be calculated at 100, 1,000, and 10,000 paying members.
- Development builds currently take lyric text from a user-contributed public database, and release would follow appropriate permission.
- Transliteration uses the OpenAI API under terms where input is not used for training.

## JASRAC message

Subject: 韓国向けアプリにおける日本作品の歌詞表示に関するお問い合わせ

Questions, as sent in Japanese and summarized here:

1. Who licenses lyric display of JASRAC works to users in Korea (JASRAC, KOMCA, the music publisher, or its Korean sub-publisher), and, if publishers license directly, how to find each work's publisher and contact.
2. Whether the use is publishing or interactive transmission, and whether display synchronized with playback changes that.
3. Whether the Hangul transliteration, and processing lyrics through the OpenAI API to generate it, need author or publisher consent, such as for the right of integrity.
4. Whether on-device saving changes the treatment.
5. Whether a license puts conditions on where the lyric text comes from, given that JASRAC does not supply it.
6. Ways other than J-WID to check management status and right holders per work.

The message cites the JASRAC FAQ items above and KOMCA FAQ item 38 on the publishing reservation, and attaches the 30-song list asking which works JASRAC administers for this use and who licenses the rest.
Its transliteration example is labeled as a self-written sentence.
The first draft's example looked like it might be a published lyric, so Andrew replaced it with a clearly original line before the scheduled send.

## NexTone message

Transcribed from a screenshot of the form's confirmation page.
Subject: 韓国向けアプリにおける歌詞表示に関するお問い合わせ

It shares the description above and differs from the JASRAC message in these points:

1. Whether NexTone licenses display in Korea directly or the user should apply to KOSCAP, and whether the KOSCAP agreement covers licensing or only collection.
2. Which foreign category the use falls under, whether a work must be entrusted in both if both apply, and how to check per work.
3. If licensable: the use category (interactive transmission or publishing), fee calculation, minimum fee, and reporting frequency.

Questions 4 to 6 match JASRAC questions 3 to 5.
Because the form takes no attachment, the message offers the 30-song CSV by email on reply and names three examples: Pretender (Official髭男dism), 踊り子 (Vaundy), and 夜に駆ける (YOASOBI).

## Song list

The attachment lists the 30 songs of `tools/lyrics-coverage/songs-2026-09.json` with title, artist, and Melon J-POP rank for 2026-08, and empty columns for society, work code, publisher, and Korean sub-publisher.
The columns are empty on purpose: the J-WID and NexTone search terms require accepting their conditions, and both prohibit copying or reproducing database contents without consent; NexTone also prohibits using its database outside its site.
The messages ask each society to check its own repertoire instead.
