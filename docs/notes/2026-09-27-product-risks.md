# SingBridge product research

Research date: 2026-09-27.
Scope: personal SingBridge project; public documentation, pinned source inspection, and a small metadata-only API probe.
This is product decision support, not a legal opinion or a completed playback/pronunciation benchmark.

## Historical status

This note preserves the research and recommendations recorded on 2026-09-27; its decision gates are not the current implementation backlog.
Since that research, the project has added visible YouTube playback, LRCLIB selection, AI pronunciation, local pronunciation editing and saving, and lyric tap playback.
See the current [README](../../README.md), [pronunciation verification](2026-09-28-pronunciation-verification.md), [editing verification](2026-09-28-pronunciation-editing-verification.md), and [tap playback verification](2026-09-28-lyric-tap-seek-verification.md).
The observations and external sources below have not been revalidated as part of archiving this note.
The [licensing inquiry](2026-09-27-lyrics-license-inquiry.md) remains an unsent draft; this archive does not record a licensing agreement or release clearance.

## Recommended direction

Keep local import as the working baseline and secondary playback source.
Evaluate the official YouTube IFrame Player as the primary online source in a separate spike.
Treat LRCLIB as the first technical lyrics candidate, with rights clearance still unresolved.
Do not equate a free endpoint, an open-source server, attribution, or device-only storage with permission to reproduce lyrics.
Do not commit to a production pronunciation server before measuring native feasibility and output quality.

## Lyrics sources and matching

### LRCLIB

The official documentation was read from the JavaScript bundle served by its documentation page because the text-only page reader returned an empty body.
It requires client identification, supports unauthenticated requests, documents optional album/duration fields, and gives a two-second duration tolerance.
It also describes 429 handling with `Retry-After`, sequential requests, and short batch delays.
Search accepts keywords; it is not a promise that arbitrary title errors or alternate recordings will match.
Publishing is an experimental, authenticated-by-challenge operation, not part of the proposed read-only integration.
See [official API documentation](https://lrclib.net/docs) and [the inspected documentation bundle](https://lrclib.net/assets/index-cbb2e41f.js).

Pinned server source confirms normalized track/artist matching, optional album/duration filters, inclusive duration bounds, and selection by track ID rather than a verified recording identity.
Consequently, duration is a useful filter but cannot prove that an MV, live version, or edited recording uses the same timing.
See [metadata query at 05ad859](https://github.com/tranxuanthang/lrclib/blob/05ad8590f6fc4d47a2d74e70f4915273df20f63c/server/src/repositories/track_repository.rs#L135).

Two sequential live searches returned candidates with synchronized lyrics: `Vaundy 踊り子` and `BTS 봄날`.
The former included records with durations of 246, 110, and 243 seconds; the latter included 274, 278, and 133 seconds.
Only metadata and presence flags were retained in the local probe record; lyric bodies are not included here.
These observations establish API reachability and ambiguous candidates, not coverage, authenticity, or timing accuracy.
See the [Vaundy query](https://lrclib.net/api/search?q=Vaundy%20%E8%B8%8A%E3%82%8A%E5%AD%90) and [BTS query](https://lrclib.net/api/search?q=BTS%20%EB%B4%84%EB%82%A0).

The server repository is MIT-licensed and describes a free synchronized-lyrics service.
That software license is not evidence of a catalog-wide lyric reproduction or transliteration sublicense.
This review did not establish LRCLIB's rights clearance or redistribution terms; it also does not establish that no rights agreements exist.
See [LRCLIB source and license](https://github.com/tranxuanthang/lrclib/tree/05ad8590f6fc4d47a2d74e70f4915273df20f63c).

Recommendation: exact metadata query first, search candidates second, explicit recording confirmation, then per-source offset adjustment.
Keep plain lyrics explicitly unsynchronized instead of assigning every line a usable timestamp of zero.
Do not add community publishing until consent, rights, and overwrite behavior have their own contract.
Use a curated target list for a later coverage study; a large database dump is unnecessary for the first small trial.

### Spotube implementation reference

The supplied `KRTirtho/spotube` URL resolves to `team-spotube/spotube`; its default branch at inspection was `master`.
At commit `69a310c`, the inspected lyrics provider calls LRCLIB `/api/get`, sends metadata and a versioned User-Agent, and omits duration when it is unknown.
It parses synchronized lyrics, otherwise creates static lines, reads/writes a local Drift table, and exposes an integer delay state.
This file does not implement search fallback.
These are findings about that file, not an exhaustive claim about every extension or playback provider in Spotube.
See [pinned lyrics provider](https://github.com/team-spotube/spotube/blob/69a310c78f5ceaf4eab7dfee98f187d38211c9ba/lib/provider/lyrics/synced.dart).

Use its request and fallback concepts as references; do not copy playback extraction or infer permissions from another application's existence.
Historical provider migration motives were not verified.

### Commercial providers

LyricFind offers licensed lyric display and separate translation products.
Neither public product description establishes Japanese-to-Hangul phonetic transformation, user-provided LRC processing, offline caching, or minimum commercial cost.
Request a written scope and quote through [LyricFind sales](https://www.lyricfind.com/contact); see [products](https://www.lyricfind.com/products) and [translations](https://www.lyricfind.com/products/translations).

Musixmatch's public API terms default to non-commercial use unless agreed otherwise in writing, prohibit specified karaoke uses, and require prior written approval for AI/ML use, including prompts.
Therefore, a paid plan alone should not be assumed to authorize this practice experience or third-party LLM transliteration.
The standard terms were fetched directly over HTTPS when the text-only browser reader failed.
Ask whether a commercial agreement expressly covers practice/repeat, phonetic transformation, caching, and AI processing.
See [API terms](https://about.musixmatch.com/apiterms) and [business inquiry](https://about.musixmatch.com/business/lets-talk).

No vendor inquiry was sent and no commercial quote was received.

## Rights boundaries

Korean Copyright Act Article 30 concerns non-commercial reproduction of published works for personal, family, or similarly limited use.
Article 36 permits specified transformations when the underlying use falls within listed exceptions, including Article 30; it is not a general permission for an app operator to distribute transformed lyrics.
Whether a specific phonetic rendering is reproduction or adaptation, and whether a particular app workflow qualifies, requires case-specific advice.
See [Article 30](https://law.go.kr/법령/저작권법/제30조) and [Article 36](https://law.go.kr/법령/저작권법/제36조).

KOMCA's public guidance distinguishes authors' rights from performer and recording-producer rights.
Do not assume all Korean repertoire or every use is covered by one organization or one agreement.
See [KOMCA FAQ](https://www.komca.or.kr/CTLJSP?EVENTID=info_05_list&MENUID=1000005023005&SYSID=PATHFINDER&S_PAGENUMBER=1&S_ROWS=100&S_TTCON=).

For comparison, US law reserves reproduction and derivative-work rights, while fair use considers several factors, including purpose and market effect.
A free or educational app is not automatically exempt.
See [17 USC 106](https://uscode.house.gov/view.xhtml?req=%28title%3A17+section%3A106+edition%3Aprelim%29) and [17 USC 107](https://uscode.house.gov/view.xhtml?edition=prelim&req=granuleid%3AUSC-prelim-title17-section107).

Product implication: direct client requests reduce operator-server storage, but still involve receipt, display, and possibly device reproduction.
Server caching and user-to-user sharing add uses requiring separate review.
Hash/timing-only storage is narrower than storing text, but does not by itself waive supplier retention or deletion terms.
Attribution is a useful obligation, not a substitute for permission.
Treat user-input-only processing as a narrower design to evaluate, not a legal guarantee.

## Pronunciation pipeline

| Candidate                                                                         | Verified capability                                     | Implication                                                                                               |
| --------------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| [Sudachi Java](https://github.com/WorksApplications/Sudachi)                      | Japanese tokenization and readings; Java implementation | Useful reading-stage reference, not a direct iOS Kotlin/Native dependency or Hangul renderer.             |
| [sudachi.rs](https://github.com/WorksApplications/sudachi.rs)                     | Rust implementation                                     | A C ABI bridge is a possible native route; no SingBridge iOS build was tested.                            |
| [MeCab C API](https://taku910.github.io/mecab/libmecab.html)                      | C/C++ API for morphological analysis                    | Candidate for a small native proof of concept; engine and dictionary notices must be assessed separately. |
| [Kuromoji](https://github.com/atilika/kuromoji)                                   | Java tokenizer with readings                            | Similar JVM/iOS boundary to Sudachi Java.                                                                 |
| [g2pK](https://github.com/Kyubyong/g2pK)                                          | Python Korean grapheme-to-pronunciation processing      | Useful reference for Korean sound rules; output is not automatically English-friendly spelling.           |
| [Korean romanization rules](https://www.korean.go.kr/front_eng/roman/roman_01.do) | Official romanization system                            | A reference layer, not evidence of singability for English speakers.                                      |

Separate source reading/G2P from target-script rendering and user correction.
Japanese kanji readings, sung long vowels, and exceptional readings require explicit evaluation; Korean sound changes must precede an English-oriented display policy.
Kotlin/Native supports [C interop](https://kotlinlang.org/docs/native-c-interop.html), so a server is not inherently mandatory.
Native packaging, dictionary size, latency, and cross-platform consistency remain untested.
Do not add a generic multilingual layer or ship an LLM fallback before those decisions are measured.

Next quality experiment: original or explicitly licensed short fixtures covering ambiguous Japanese readings, long vowels, geminates, Korean liaison/nasalization/tensification, and mixed-script input.
Record exact tool/dictionary versions, expected readings, generated output, human corrections, native size, and latency.
Then test licensed song passages against the actual sung reading with fluent reviewers.
No full-song quality score or native performance result was produced in this research.

## Competitors

| Product                    | Source and practice model                                                                                                  | Business model / gap                                                                                                                                                                                         |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| LingoClip / LyricsTraining | YouTube embeds and licensed/user-contributed lyrics are described in its policies; cloze games and karaoke are advertised. | Free use with Premium; this establishes adjacent demand, not Japanese-to-Hangul quality. [Policy](https://lingoclip.com/privacy), [App Store](https://apps.apple.com/us/app/lingoclip/id1192698323).         |
| LingoTube                  | YouTube dual subtitles, local video/subtitle support, AB repeat, and speaking practice.                                    | Ads disclosed; lyric licensing and automatic phonetic output were not established. [Google Play](https://play.google.com/store/apps/details?hl=en-US&id=com.springwalk.lingotube).                           |
| Sounter                    | Song-based listening, lyric completion, and vocabulary exercises.                                                          | Ads and in-app purchases; supplier rights and phonetic output were not established. [Official site](https://sounter.com/), [Google Play](https://play.google.com/store/apps/details?id=com.sounter.sounter). |
| Musixmatch                 | Synchronized lyrics, translations, community contributions, and music-service connections.                                 | Free app with Premium; the inspected listing does not establish SingBridge's proposed phonetic practice workflow. [App Store](https://apps.apple.com/us/app/musixmatch-dynamic-lyrics/id448278467).          |

Inference: timed lyrics, repeat, and translation alone are already served by adjacent products.
The proposed differentiation is a pronunciation display that people can successfully sing from; it remains untested.
Old promotional pricing was excluded, and no competitor catalog-wide coverage claim was validated.

## YouTube and Apple Music

Use an OS WebView and a visible, unobscured IFrame player.
The official minimum-functionality document requires client identity through Referer, explains local-HTML base URLs for Android/iOS, specifies an app-ID-based HTTPS identifier, and sets a 200-by-200 minimum viewport.
See [YouTube minimum functionality](https://developers.google.com/youtube/terms/required-minimum-functionality).

The IFrame API documents errors 101/150 for embed restrictions and 153 for missing identity.
It exposes current time and seeking, but this is not a precision guarantee; seeking can involve keyframe/buffering behavior.
See [IFrame reference](https://developers.google.com/youtube/iframe_api_reference).

YouTube policies prohibit audio/video separation, hidden/background playback, and specified interference with the player.
Commercial clients can be permitted subject to restrictions, including selling access to API services and advertising placement.
Charging for independent practice value is a candidate design requiring policy review, not blanket authorization.
See [Developer Policies, III.G and III.I](https://developers.google.com/youtube/terms/developer-policies).

Apple publicly offers MusicKit for Android as well as Apple-platform and web integrations, so “MusicKit is Swift-only” is too broad.
iOS Swift bridging remains an implementation concern, while lyric synchronization permissions were not established here.
See [Apple MusicKit](https://developer.apple.com/musickit/).

Proposed YouTube spike: URL/video-ID input, visible player, identity configuration, play/pause/seek state, foreground pause, embed-error alternatives, and per-video timing offset.
Measure seek request-to-settled latency and repeat overshoot on both platforms and several networks.
Do not assume the current local-player contract's immediate seek semantics are sufficient.
No WebView playback latency was measured in this research.

## Decision gates

1. Confirm lyric/phonetic/AI rights and minimum commercial terms using the separate inquiry draft.
2. Run the visible YouTube player spike without adding extraction, background playback, or catalog search infrastructure.
3. Evaluate LRCLIB candidates against a curated recording list, recording false matches separately from missing lyrics.
4. Measure pronunciation quality before selecting server deployment or native packaging.

Project-scoped Oracle retrieval for lyrics licensing/transliteration returned `[no precedent found]`.
The decision therefore relies on the inspected sources and current product constraints, not an inferred historical rule.
