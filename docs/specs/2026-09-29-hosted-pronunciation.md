# Hosted pronunciation service

## Status and authority

Issue: #16.
This spec is a draft for the operator's approval; merging it approves the path and its non-goals, not the start of implementation.
On 2026-09-29 the operator chose an authenticated hosted service over on-device processing and over keeping AI output developer-only, and chose Firebase Cloud Functions with Firebase App Check.
The hosting platform and the authentication method are new decisions: an Oracle lookup for earlier personal-project precedent on either returned `[no precedent found]`.

Implementation starts only when both of these hold:

- #17 records the answers on lyric, phonetic-derivative, and AI-processing rights (decision gate 1 of the [2026-09-27 research](../notes/2026-09-27-product-risks.md#decision-gates)).
- #21 records the reviewer edit rate on real songs (decision gate 4 of the same research: measure pronunciation quality before choosing server deployment).

## Why

Pronunciation works today only through the development server on `127.0.0.1:18773`, which the README describes as not a production authentication boundary.
No tester outside the development machine can generate pronunciation, so the Gate B closed test (#26) cannot start.
The README requires "a separately approved authenticated HTTPS service and lyric-processing policy" for release support; this spec is that proposal.

## Path

One HTTPS function receives the existing request contract, calls OpenAI with the server-held key, and returns the existing result contract.

- **Host:** Cloud Functions for Firebase (2nd gen, Node.js), in a Firebase project owned by the operator's personal account.
  Cloud Functions are "Not applicable" on the Spark plan in the [Firebase pricing page](https://firebase.google.com/pricing) (accessed 2026-09-29), so the project needs the Blaze plan.
- **Code reuse:** the function imports `validateRequest`, `validateResult`, `generatePronunciation`, and the prompt from `server/pronunciation.mjs` unchanged, so the hosted and development paths share one contract and one test suite.
  The development server stays for local work.
- **Secret:** the OpenAI key lives only in the function's secret configuration; it never enters Kotlin, Swift, HTML, or generated app configuration.
- **Transport:** the native bridges (`PronunciationBridge.kt`, `PronunciationBridge.swift`) send the same JSON body over HTTPS to the function instead of the loopback address; the page and its `context` lines (#42) stay unchanged.

## Authentication

There are no user accounts; the function trusts the app build, not a person.

- The native apps use Firebase App Check with App Attest or DeviceCheck on iOS and Play Integrity on Android; the [custom-backend guide](https://firebase.google.com/docs/app-check/custom-resource-backend) (accessed 2026-09-29) lists those providers.
- Each request carries a limited-use App Check token, and the function verifies it with the Node.js Admin SDK with `consume: true` and rejects the request when the result reports `alreadyConsumed`, as the custom-backend guide instructs, so a captured token cannot be replayed.
  Verification alone succeeds for a consumed token; the explicit rejection is what stops a replay.
  Replay protection is beta and supports only the Node.js SDK, per the custom-backend guide, and it "adds a network round trip to token verification" ([Cloud Functions guide](https://firebase.google.com/docs/app-check/cloud-functions), accessed 2026-09-29); the added latency must be measured against the Gate A time-to-first-sing target (#24).
- Nothing embedded in the app is treated as a secret, in line with the YouTube key rule in the README.
- Requests without a valid token are rejected before any OpenAI call.

## Request limits

App Check proves the app, not the person or the install, so quotas are the cost boundary.

- **Per request:** the current server limits stay: 12 lines, 3,000 characters, two context lines per side at 500 characters each, a 32 KiB body, and `max_output_tokens: 6000`.
- **Per install:** the bridge sends the Firebase installation ID; the function keeps a daily request count per ID in Firestore and rejects requests above the cap.
  The ID is client-supplied, so this cap limits an ordinary client, not an attacker who passes App Check with many IDs; the global cap below is the real bound.
- **Global:** a daily request cap for the whole project, counted in a Firestore transaction; this cap is the enforceable cost bound.
  An OpenAI spend limit is an extra backstop only if the console confirms that it blocks requests: a [Help Center](https://help.openai.com/en/articles/6614457-why-am-i-getting-an-error-message-stating-that-ive-reached-my-usage-limit) search result on 2026-09-29 describes project-level hard limits, but the page itself returned HTTP 403, and a budget that only notifies does not bound cost.
- **Deadline:** the native bridges give up after 50 seconds (Android `readTimeout`, iOS `timeoutInterval`) and the page after 55, while the development server allows the provider 45 seconds.
  The hosted function also spends time on token consumption, the Firestore transaction, and cold starts, so it must answer before the bridges' 50-second cutoff with a measured margin: it passes a shorter provider deadline, set at implementation from measured overhead, or the bridge and page deadlines move together with tests.
- **Concurrency:** one active request per installation ID, as the page already sends batches one after another.
- **Cancellation:** when the native bridge disconnects (the page sends `cancel` on a lyric or target change), the function aborts `generatePronunciation` through its `signal`, as `server/index.mjs` does on request close, so a discarded request stops consuming the provider call.

The cap values are set at implementation time from the measured cost per song, not in this spec.

## Cost per song

Measured usage is recorded in the [#29 batch rerun](../notes/2026-09-29-pronunciation-batch-rerun.md) and the [#42 context rerun](../notes/2026-09-29-pronunciation-batch-context.md); this spec does not restate those numbers.
The worst case follows from the page limits in `YouTubePronunciation.kt`: at most 240 lines of at most 500 characters and 30,000 characters in total, split into batches of at most 12 lines and 3,000 characters.
A batch that closes on the character limit holds at least 2,501 characters in at least six lines, so at most 11 such batches fit in 30,000 characters; every other batch except the last holds 12 lines, so the at most 240 − 6 × 11 = 174 remaining lines need at most 15 more, and one song needs at most 26 requests.
That bound is reached: 11 groups of five 500-character lines and one 1-character line, one more 500-character line, and 1-character lines up to 240 make 26 batches under the page's batching loop.
Each response is capped at 6,000 output tokens, so one generation pass of one song in one target language can bill at most 26 requests and 156,000 output tokens plus input.
The page can generate and save separate `ko` and `en` layers for one practice, so one song in both targets can bill at most 52 requests and 312,000 output tokens plus input.
These bounds cover passes without retries: a billed failure (incomplete, refused, or invalid output) leaves its batch missing, and generating again sends that batch again, so each retry adds up to one request and 6,000 output tokens.
The caps count requests, so retries spend the same quota; the per-install daily cap must cover one worst-case pass in both targets plus a retry allowance chosen at implementation, and the global cap bounds the rest.
Prices are not recorded here; convert token counts with OpenAI's pricing page for the pinned model at implementation time and cite its access date.

## Lyric processing

- **Leaves the device:** the lines of one batch and up to four context lines, sent to the function and from there to OpenAI.
  Video IDs, saved practices, and edits are never sent to the service.
- **Stored by the service:** nothing that contains lyric text.
  The function logs only what `server/usage.mjs` records today: sequence, request ID, model, target, line count, token counts, and whether the result was accepted.
  Request and response bodies are not logged; Cloud Logging must be checked to confirm it does not capture them.
- **Provider:** requests keep `store: false`; OpenAI's own retention policies still apply, as the README says for the development server.
- **Results:** pronunciation is returned to the app and saved only on the device, as today.

These rules are necessary but do not by themselves settle the rights question; #17 does.

## Non-goals

- User accounts, sign-in, or any per-person data.
- Server-side caching or sharing of lyrics or pronunciations between users.
- A browser or CORS endpoint; only the native bridges call the function.
- Streaming responses, a second model, or a model fallback.
- On-device pronunciation and a production dictionary engine; they remain options if #17 or #21 rules out the hosted path.
- Any change to the page, the request contract, or the result contract.

## Follow-up issues after approval

Filed when this spec merges, each blocked by #17 and #21:

1. Firebase project, Blaze plan, App Check registration for both apps, and a dedicated OpenAI project, with its spend-limit behavior confirmed in the console (operator-owned setup).
2. The Cloud Function that reuses `server/pronunciation.mjs`, with App Check verification that rejects consumed tokens, transactional Firestore quotas, a deadline inside the bridges' 50-second cutoff, cancellation on disconnect, usage logging without text, and tests with fake App Check (including a replayed token) and fake provider responses (including a cancelled request).
3. Native bridges: App Check limited-use tokens, the installation ID, and an HTTPS endpoint in release builds, with the loopback path kept for debug builds.
4. A dated note measuring the added latency against #24 and the cost per song on the hosted path.

## Acceptance of this spec

- The operator approves this path and its non-goals by merging.
- The four follow-up issues exist and name #17 and #21 as blockers.
