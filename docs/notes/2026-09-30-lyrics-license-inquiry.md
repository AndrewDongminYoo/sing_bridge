# Lyrics licensing inquiry

Issue: #17.
Replaces the message in the [2026-09-27 draft](2026-09-27-lyrics-license-inquiry.md), which predates the hosted pronunciation design.

## Contact routes

Checked on 2026-09-30 by fetching each page.

| Vendor     | Route                                                                                                        | Notes                                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| LyricFind  | `sales@lyricfind.com`, listed "For Sales inquiries" on [the contact page](https://www.lyricfind.com/contact) | Sent by email.                                                                                                                       |
| Musixmatch | "Send an enquiry" form on [Let's talk](https://about.musixmatch.com/business/lets-talk)                      | The page lists no email address, and the form opens in the browser, so its fields and length limit were not read; paste the message. |

## What changed since the 2026-09-27 draft

- Source phrases can be Japanese, Korean, English, or Spanish (experimental), and the output is Hangul or Latin script.
- Pronunciation runs on a hosted function that sends lyric lines to OpenAI with `store: false`, logs no lyric text, and keeps only request counts ([hosted pronunciation spec](../specs/2026-09-29-hosted-pronunciation.md)).
- A saved practice keeps a copy of the source lyrics with its pronunciation on the device.
- During development, lyrics come from LRCLIB, which does not establish commercial rights.

## Message

Subject: SingBridge: licensing scope for phonetic lyrics in a song-practice app

Hello,

I am an independent developer evaluating lyric licensing for SingBridge, an Android and iOS app that helps people sing songs in languages they cannot read.
Nothing has launched commercially.

How it works in the current prototype, and as planned for release:

- The user plays the song in the official embedded YouTube player, or with audio they supply.
- The app shows the original lyrics line by line in sync with playback, with seeking and repeated practice of a line.
- Under each line it shows a phonetic transliteration (not a translation): Japanese, English, or Spanish phrases in Hangul for Korean speakers, or Japanese and Korean phrases in Latin script for English speakers.
- The transliteration is generated per request by an LLM provider (OpenAI) with provider-side storage disabled and no model training. For release, a hosted function would send the lyric lines, log no lyric text, and keep only request counts.
- A user can save a practice; the lyrics and the transliteration are then stored only on that device.

Could you confirm in writing whether this use is licensable, and quote the lowest applicable terms for:

1. Displaying original lyrics with line-level synchronization, seeking, and repetition, and whether you classify this as karaoke.
2. Generating and displaying phonetic derivatives next to the originals, and whether you offer pronunciation layers yourselves.
3. Sending licensed lyric lines to a third-party LLM for transient processing: approvals required, and what is allowed for prompts, logs, and the generated output.
4. On-device storage of lyrics and derivatives for offline practice: allowed retention and deletion or takedown obligations.
5. Lyrics supplied by users rather than taken from your catalog.
6. Whether mobile clients may call your API directly, or must go through a backend.
7. Attribution and usage reporting, territorial limits, covered repertoire, minimums, and term.

For comparison only (not forecasts), please show illustrative pricing at 1,000 and 10,000 monthly active users, and how it differs for South Korea, Japan, and the United States.
Please also separate what the standard API terms include from what needs a separate agreement.

Thank you,
Dongmin Yu
SingBridge (independent developer)

## Contact log

On 2026-09-30, the message was prepared as two Gmail drafts in Andrew's account: an email to `sales@lyricfind.com`, and the text to paste into the Musixmatch form.
Neither was sent by the agent.

| Vendor     | Sent    | Route | Answer  |
| ---------- | ------- | ----- | ------- |
| LyricFind  | Not yet | Email | Not yet |
| Musixmatch | Not yet | Form  | Not yet |
