# Lyrics licensing inquiry

Issue: #17.
Replaces the message in the [2026-09-27 draft](2026-09-27-lyrics-license-inquiry.md), which predates the hosted pronunciation design.

## Contact routes

Checked on 2026-09-30 by fetching each page.

| Vendor     | Route                                                                                                        | Notes                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| LyricFind  | `sales@lyricfind.com`, listed "For Sales inquiries" on [the contact page](https://www.lyricfind.com/contact) | Sent by email.                                                                                            |
| Musixmatch | "Send an enquiry" form on [Let's talk](https://about.musixmatch.com/business/lets-talk)                      | The page lists no email address. Andrew sent to `apisupport@musixmatch.com` instead; see the contact log. |

## What changed since the 2026-09-27 draft

- Source phrases can be Japanese, Korean, English, or Spanish (experimental), and the output is Hangul or Latin script.
- Pronunciation runs on a hosted function that sends lyric lines to OpenAI with `store: false`, logs no lyric text, and keeps only request counts ([hosted pronunciation spec](../specs/2026-09-29-hosted-pronunciation.md)).
- A saved practice keeps a copy of the source lyrics with its pronunciation on the device.
- During development, lyrics come from LRCLIB, which does not establish commercial rights.

## Message

Andrew edited the prepared draft before sending; this is the text both vendors received, with the same subject.

Subject: SingBridge: licensing scope for phonetic lyrics in a song-practice app

Hello,

I am an independent developer evaluating lyric licensing for SingBridge, an Android and iOS app that helps people sing songs in languages they cannot read.
We are seeking rights before a commercial lyrics release.

The proposed licensed experience would work as follows:

- The user plays the song in the official embedded YouTube player, or with audio they supply.
- The app shows the original lyrics line by line in sync with playback, with seeking and repeated practice of a line.
- Under each line it shows a phonetic transliteration (not a translation): Japanese, English, or Spanish phrases in Hangul for Korean speakers, or Japanese and Korean phrases in Latin script for English speakers.
- Pronunciation generation would send lyric lines to OpenAI per request with `store: false`; OpenAI's retention policies still apply. A planned hosted function would avoid logging lyric text and record usage metadata.
- A user could save a practice, with lyrics and transliteration stored on their device.

Could you confirm in writing whether this use is licensable, and provide the applicable commercial terms and illustrative pricing for:

1. Displaying original lyrics with line-level synchronization, seeking, and repetition, and whether you classify this as karaoke.
2. Generating and displaying phonetic derivatives next to the originals, and whether you offer pronunciation layers yourselves.
3. Sending licensed lyric lines to a third-party LLM for pronunciation inference without model training: approvals required, and what is allowed for prompts, logs, and the generated output.
4. On-device storage of lyrics and derivatives, including offline practice: allowed retention and deletion or takedown obligations.
5. Lyrics supplied by users rather than taken from your catalog.
6. Whether mobile clients may call your API directly, or must go through a backend.
7. Attribution and usage reporting, territorial limits, covered repertoire, minimums, and term.

For comparison only (not forecasts), please show illustrative pricing at 1,000 and 10,000 monthly active users, and how it differs for South Korea, Japan, and the United States.
Please also separate what the standard API terms include from what needs a separate agreement.

Thank you,
Dongmin Yu
SingBridge (independent developer)

## Contact log

The agent prepared Gmail drafts on 2026-09-30 and sent nothing; Andrew sent both messages from his Gmail account.
The Musixmatch message went to `apisupport@musixmatch.com` instead of the web form, because Andrew was told that Musixmatch takes API requests at that address.
Send times below are read from the Sent folder.

| Vendor     | Sent (UTC)           | Route                                | Answer                                              |
| ---------- | -------------------- | ------------------------------------ | --------------------------------------------------- |
| LyricFind  | 2026-09-30T01:03:03Z | Email to `sales@lyricfind.com`       | See [replies](2026-10-01-lyrics-license-replies.md) |
| Musixmatch | 2026-09-30T01:09:45Z | Email to `apisupport@musixmatch.com` | See [replies](2026-10-01-lyrics-license-replies.md) |
