# Green Room

An agent that finds podcasts whose audiences share your guest's taste, with the Qloo evidence behind each result, and drafts a pitch you edit. Built for the Qloo Agentic Hackathon.

Green Room only drafts. It never sends email.

## How a run works

1. **Resolve** the guest's work and up to 3 listener interests with Qloo `/search`.
2. **Confirm.** If a name has more than one match, the run stops with `needs_confirmation` and the UI asks you to pick. Nothing is recommended until you choose. A single match is used as returned.
3. **Recommend** podcasts with `/v2/insights` using only resolved or confirmed entity IDs.
4. **Inspect** a show: receipt, plus optional audience (`/v2/insights`, demographics) and shared angles (`/v2/analysis/compare`). If an enrichment fails, the shortlist and pitch draft still work.

## Guarantees

- **Request budget.** One run (one `/api/run` or `/api/show` request) makes at most 8 Qloo requests, retries included. If the budget runs out the response is `partial` and lists exactly what was not fetched.
- **Result-level provenance.** Every podcast carries `{ entityId, queryId, source, retrievedAt, affinity?, explanation?, popularity? }`. Missing fields stay missing. A result without provenance is not displayed. The detail panel shows this as a receipt.
- **Popularity.** Shown as "Qloo popularity index" only when Qloo returns it, always with: "Popularity is a Qloo index. It is not audience size, access, or booking likelihood." It is never used as a filter, and there are no reach tiers.
- **Modes stay distinct.** `LIVE`, `RECORDED` and `SAMPLE` have separate badges. SAMPLE is chosen only by `QLOO_MODE=sample`. A live failure, or live mode without a key, returns a typed degraded state, never sample data. RECORDED is reserved; no recording exists yet.
- **No tie rule, no booking claims.** Affinity is Qloo's score for the combined inputs, not a probability and not listener overlap.

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

Validated against stubbed responses and sample fixtures only. No live Qloo call has been made, so response shapes (including `/search` type filters and the explainability payload) are unverified. See `PROGRESS.md`.

Release requirement: the hackathon needs a public repository with a visible open-source license. The MIT license is in `LICENSE`; repository visibility has not been verified and must be checked manually before submitting.

License: MIT
