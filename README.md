# Green Room

An agent that finds podcasts whose audiences share your guest's taste, with the Qloo evidence behind each result, and drafts a pitch you edit. Built for the Qloo Agentic Hackathon.

Green Room only drafts. It never sends email.

## How a run works

1. **Resolve** the guest's work and up to 3 listener interests with Qloo `/search`.
2. **Confirm.** If a name has more than one match, the run stops with `needs_confirmation` and the UI asks you to pick. Nothing is recommended until you choose. A single match is used as returned.
3. **Recommend** podcasts with `/v2/insights` using only resolved or confirmed entity IDs.
4. **Inspect** a show: receipt, plus optional audience (`/v2/insights`, demographics) and shared angles (`/v2/analysis/compare`). If an enrichment fails, the shortlist and pitch draft still work.

## Visual direction

A dark forest-green "listening room" frame around warm ivory product surfaces, editorial serif display type (system serif stack, no web fonts) with clean sans UI, subtle cobalt route lines and one restrained amber accent. Artwork is abstract botanical/landscape SVG generated from the result id (`components/art.tsx`); there are no stock photos and no people.

- **Desktop (1024px+):** dark nav (Discover, Shortlists, Receipts), ivory workspace (hero, campaign brief, top 3 matches sorted by affinity) and a dark "Proof, not promise." evidence panel for the selected match. The pitch opens in a side sheet.
- **Mobile:** one decision per screen: Discover ("Your 3 matches": art, title, score), Receipt ("Why this match": score, up to 3 theme chips, source, retrieved, data mode, JEV state) and Pitch ("Pitch notes": short editable draft with a "Review before using" notice). Icon-first bottom navigation, 44px minimum targets.
- Affinity is shown on Qloo's own 0-1 scale (never as a percentage) and always described as thematic alignment, not audience size, access, or booking likelihood.
- Descriptions come from Qloo only (`properties.description`, unverified shape). When absent the row says "Description unavailable from Qloo". Theme chips show at most 3 and fewer when Qloo returns fewer.
- JEV is not connected: the UI says so and never claims a review happened. There is no send or email action anywhere.

## Guarantees

- **Request budget.** One run (one `/api/run` or `/api/show` request) makes at most 8 Qloo requests, retries included. If the budget runs out the response is `partial` and lists exactly what was not fetched.
- **Result-level provenance.** Every podcast carries `{ entityId, queryId, source, retrievedAt, affinity?, explanation?, popularity? }`. Missing fields stay missing. A result without provenance is not displayed. The detail panel shows this as a receipt.
- **Popularity.** Shown as "Qloo popularity index" only when Qloo returns it, always with: "Popularity is a Qloo index. It is not audience size, access, or booking likelihood." It is never used as a filter, and there are no reach tiers.
- **Modes stay distinct.** `LIVE`, `RECORDED` and `SAMPLE` have separate badges. SAMPLE is chosen only by `QLOO_MODE=sample`. A live failure, or live mode without a key, returns a typed degraded state, never sample data. RECORDED is reserved; no recording exists yet.
- **No tie rule, no booking claims.** Affinity is Qloo's score for the combined inputs, not a probability and not listener overlap.

## Live smoke test

`npm run smoke:qloo` checks the real API contract. It requires `QLOO_API_KEY` in your local environment (export it; never pass it as an argument) and prints `blocked: missing QLOO_API_KEY` without it.

It runs: search (one type, and the multi-type list the app sends), podcast insights, a popularity-filter probe, compare, demographics, a malformed request (must be a 4xx) and an empty search. Output is structural only: endpoint, parameter names, HTTP status, field paths with JS types, result counts, numeric rate-limit headers, and a pass/fail verdict per expected path. It never prints the key or any response value and writes nothing to disk. Do not commit recordings or live responses.

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

Sample mode: include the word "ambiguous" in a name to see the confirmation step.

Live mode: set `QLOO_MODE=live` and `QLOO_API_KEY` (server-only, never `NEXT_PUBLIC_`). `GET /api/health` reports `{sha, mode, key_present}`.

## Status

Validated against stubbed responses and sample fixtures only. No live Qloo call has been made (the live smoke test is blocked without a key), so response shapes are documented but not live-verified: see `PROGRESS.md` for the exact list. Nothing is deployed.

Release requirement: the hackathon needs a public repository with a visible open-source license. The MIT license is in `LICENSE`; repository visibility has not been verified and must be checked manually before submitting.

License: MIT
