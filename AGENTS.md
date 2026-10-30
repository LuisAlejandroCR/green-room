# AGENTS.md

Rules for any agent working in this repo.

- Hackathon release requires a public repo with a visible OSI license (MIT is in `LICENSE`). Visibility is not verified here; check it manually before submitting. English only in UI, docs, comments and commits.
- All Qloo access goes through `lib/qloo.ts`. It never throws; it returns `{status, mode, source, queryId, retrievedAt, data, error}`.
- Every run gets its own request-scoped `Budget` (`createBudget()`, max 8 Qloo requests, retries included). Never use process-global counters. When it is exhausted, return a typed `partial` that states what was not fetched.
- Never select an entity ID silently when `/search` returns several matches: return `needs_confirmation`. Only resolved-unambiguous or user-confirmed IDs may reach recommendations.
- Every returned podcast carries per-result provenance `{entityId, queryId, source, retrievedAt, affinity?, explanation?, popularity?}`. Optional fields are omitted when Qloo omits them; never default to `0`. The UI must not display a result without provenance.
- Popularity is a Qloo index only: no filtering on it, no reach tiers, no "reachable" wording, and always the standard note next to the value.
- No tie-marking or other score thresholds unless a validated policy is added.
- Never fall back from live or recorded data to sample fixtures. Sample is selected only by `QLOO_MODE=sample` and is labeled `SAMPLE · Not Qloo data`. Qloo failing means a typed degraded/malformed/partial state, never a 500 and never invented data.
- Demographics and compare are optional enrichments: their failure must not block the shortlist or the pitch draft.
- Send Qloo only allowed params per `filter.type` (it silently ignores the rest); `take` <= 50.
- Secrets (`QLOO_API_KEY`, any future JEV key) are server-only: no `NEXT_PUBLIC_*`, never logged, never committed. Do not commit real Qloo responses.
- Every route that spends Qloo requests must go through `limitRequest` (`lib/guard.ts`): typed 429 with retry guidance, no Qloo call when limited.
- `npm run smoke:qloo` is the only place that may call Qloo outside the app. It must print structure only (paths, types, counts, statuses, numeric rate-limit headers), never the key or any response value, and write nothing to disk. Never commit recordings or live responses.
- Do not ask for, create or print an API key. If `QLOO_API_KEY` is absent, record `blocked: missing QLOO_API_KEY` and continue with non-network work.
- Green Room drafts pitches; it never sends email.
- Markdown files: this file, `PROGRESS.md`, and the root `README.md` only.
