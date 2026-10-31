# Green Room

An agent that finds podcasts whose audiences share your guest's taste, with the Qloo evidence behind each result, and drafts a pitch you edit. Built for the Qloo Agentic Hackathon.

Green Room only drafts. It never sends email.

## How a run works

1. **Resolve** the guest's work and up to 3 listener interests with Qloo `/search`.
2. **Confirm.** If a name has more than one match, the run stops with `needs_confirmation` and the UI asks you to pick. Nothing is recommended until you choose. A single match is used as returned.
3. **Recommend** podcasts with `/v2/insights` using only resolved or confirmed entity IDs.
4. **Inspect** a show: receipt, plus optional audience (`/v2/insights`, demographics) and shared angles (`/v2/analysis/compare`). If an enrichment fails, the shortlist and pitch draft still work.

## Visual direction

Warm paper, a deep forest-green structure, Fraunces for headlines and Hanken Grotesk for interface (both self-hosted, OFL). Images are real: Qloo cover art for every podcast and for each search candidate (`properties.image.url`, https only). Generated cut-paper SVG art (`components/art.tsx`) is used only when Qloo has no image. Each show gets a colour from its id (`lib/ui/vibes.ts`); colour never encodes a score.

- **Desktop (1024px+):** a dark sidebar (Discover, Saved), a paper workspace (hero, campaign card with the work's cover and "Edit brief", ranked matches with covers, topics and affinity rings) and a sticky dark "Proof, not promise." panel for the selected match: topics or shared themes, source and query id, retrieval time, data mode, popularity with its note, and which of your picks shaped the list (Qloo explainability). Pitch Studio opens in a side sheet with Copy.
- **Phone web (below 1024px):** straight to the point and jargon-free. Start (one-tap real example, then your own brief), optional "fans also love" with Qloo tag chips, "Which one did you mean?" with real covers, a card deck (swipe right keeps, left skips, every gesture has a button, "More like this") and "Your 3 picks" with Copy pitch and Share. Motion stops under `prefers-reduced-motion`. Controls are at least 48px and screens never scroll horizontally.
- **Android app (`android-app/`):** native React Native screens built with Expo, mirroring the phone flow (see below).
- Affinity stays on Qloo's 0-1 scale on desktop. The phone shows the same value out of 100 as "fit", described as shared taste, never as a booking promise.
- Descriptions come from Qloo only (`properties.description`, unverified shape). When absent the row says "Description unavailable from Qloo". Theme chips show at most 3 and fewer when Qloo returns fewer.
- Pitch Studio: Claude drafts from the Qloo evidence only and JEV reviews the draft against that evidence. Model calls go to OpenRouter first (`OP_API_KEY`, `OP_BASE_URL`, model `anthropic/claude-sonnet-5.5`) and to Anthropic (`ANTHROPIC_API_KEY`) when OpenRouter is not set or fails. When either is not configured the UI says so and never claims a draft or review happened; the deterministic draft (`lib/pitch.ts`) is the labelled fallback. There is no send or email action anywhere.

## Guarantees

- **Request budget.** One run (one `/api/run` or `/api/show` request) makes at most 8 Qloo requests, retries included. If the budget runs out the response is `partial` and lists exactly what was not fetched.
- **Result-level provenance.** Every podcast carries `{ entityId, queryId, source, retrievedAt, affinity?, explanation?, popularity? }`. Missing fields stay missing. A result without provenance is not displayed. The detail panel shows this as a receipt.
- **Popularity.** Shown as "Qloo popularity index" only when Qloo returns it, always with: "Popularity is a Qloo index. It is not audience size, access, or booking likelihood." It is never used as a filter, and there are no reach tiers.
- **Modes stay distinct.** `LIVE`, `RECORDED` and `SAMPLE` have separate badges. SAMPLE is selected only by `QLOO_MODE=sample` for local development; the demo button uses live data. A live failure, or live mode without a key, returns a typed degraded state, never sample data. RECORDED is reserved; no recording exists yet.
- **No tie rule, no booking claims.** Affinity is Qloo's score for the combined inputs, not a probability and not listener overlap.

## Live smoke test

`npm run smoke:qloo` checks the real API contract. It requires `QLOO_API_KEY` in your local environment (export it; never pass it as an argument) and prints `blocked: missing QLOO_API_KEY` without it.

It runs: search (one type, and the multi-type list the app sends), podcast insights, a popularity-filter probe, compare, demographics, a malformed request (must be a 4xx) and an empty search. Output is structural only: endpoint, parameter names, HTTP status, field paths with JS types, result counts, numeric rate-limit headers, and a pass/fail verdict per expected path. It never prints the key or any response value and writes nothing to disk. Do not commit recordings or live responses.

## What complements Qloo

Everything on the desk is Qloo data except these, each labelled where it appears:

- **Place names on the heatmap.** Qloo's heatmap returns geohash cells (lat, lon, affinity) without names. Green Room names a cell after the nearest of 61 large US cities within 120 km (`lib/ui/places.ts`, built-in approximate coordinates) and lists where the top tenth clusters as candidate book-tour stops. Qloo's numbers are unchanged.
- **Random brief.** "Find live matches" with an empty field types a random well-known title (`lib/ui/random.ts`); Qloo then resolves and ranks it like any brief.
- **Claude (via OpenRouter, else Anthropic).** A second opinion on ambiguous names, pitch drafts from the Qloo evidence, and the model-only baseline. Each model-only name can be checked against Qloo search (`/api/lookup`, one request); only the same name counts as found, because Qloo search is fuzzy.
- **JEV** reviews pitch drafts against the Qloo evidence.

## Rate limiting

`/api/run` and `/api/show` are limited per client IP (6 and 20 requests per minute) plus a global cap per route (40 and 120 per minute). Over the limit the server answers a typed `429 {state: "rate_limited", retryAfterSeconds}` with `Retry-After`, and makes no Qloo request. The limiter is in memory (no Redis): it is best-effort per server instance, bounded to 5000 tracked IPs, and fails closed when full. The client IP comes from `x-real-ip`, else the last `x-forwarded-for` entry; unknown clients share one bucket.

## Run

```bash
cp .env.example .env.local   # QLOO_MODE=sample needs no key
npm install
npm run dev
npm run typecheck
npm test
npm run build
```

Demo: **See a real example** runs a fixed, human-confirmed brief (Atomic Habits + Nike Training Club, `lib/demo.ts`) against live Qloo like any typed brief.

Sample mode is for local development only (`QLOO_MODE=sample`), always labelled `SAMPLE · Not Qloo data`; include the word "ambiguous" in a name to see the confirmation step.

Live mode: set `QLOO_MODE=live` and `QLOO_API_KEY` (server-only, never `NEXT_PUBLIC_`). `GET /api/health` reports `{sha, mode, key_present}`.

## Android app (Expo, APK)

`android-app/` is a separate Expo project with native React Native screens: Start, optional "fans also love", "Which one did you mean?", the swipe deck with a Qloo facts sheet, and "Your 3 picks" with Copy pitch and Android Share. It calls only the deployed `/api/run` and `/api/show`; `QLOO_API_KEY`, `JEV_API_KEY` and the Claude key stay on the server and are never in the APK. The API base is `EXPO_PUBLIC_API_BASE`, set per profile in `android-app/eas.json`; a build without it opens on an "API not configured" screen.

```bash
cd android-app
npm install
npm run typecheck
npx eas-cli@latest login      # your Expo account
npm run build:apk             # EAS cloud build, profile "preview", buildType "apk"
```

EAS prints a download link for the `.apk` when the build finishes. Package: `com.luisalejandrocr.greenroom`.

## CI

`.github/workflows/ci.yml` runs on pull requests and pushes to `main`: web typecheck, tests and build in sample mode (no keys), and for the Android app typecheck, `expo-doctor` and a Metro bundle against the preview API base. The APK is built by EAS, not in CI.

## Status

Deployed at https://app-green-room.vercel.app (live Qloo; `/api/health` reports `{sha, mode, key_present}`). Live-verified with `npm run smoke:qloo` and exercised in the browser against live Qloo on desktop and phone sizes; see `PROGRESS.md`. The Android APK has not been built or installed on a device yet.

Release requirement: the hackathon needs a public repository with a visible open-source license. The MIT license is in `LICENSE`; repository visibility has not been verified and must be checked manually before submitting.

License: MIT
