# PROGRESS

Deadline: 2026-10-30 23:45 EDT (22:45 Bogota). Code freeze 18:30, submit 20:45 Bogota.

## Alignment work (1 of max 6 iterations used)

Plan: one vertical change covering the P0 alignment items; validate with typecheck, tests and build, plus a sample-mode browser check.

Done:
- Entity confirmation: `lib/run.ts` returns `needs_confirmation` with candidates; recommendations only use resolved or confirmed IDs. UI has a radio-group step with Cancel (explicit `cancelled` state).
- Reach tiers, `REACH_MAX`, tier badges and the `filter.popularity.max` request parameter removed. Popularity shows as "Qloo popularity index" only when returned, with the standard note.
- Request budget: `createBudget()` per run, 8 requests including retries; `partial` response with exact `notFetched`.
- Per-result provenance `{entityId, queryId, source, retrievedAt, affinity?, explanation?, popularity?}` preserved through `adapt.ts`; receipt in the detail Sheet. Results without provenance are not displayed.
- No silent fallback: live failures and live-without-key return typed degraded states.
- 0.05 tie rule removed. Demographics and compare are optional; their failure shows a notice and does not block the shortlist or pitch.
- Removed unused `rankShortlist`.

## Validation (actual runs, 2026-10-30)

- `npx tsc --noEmit`: pass.
- `npm test`: 29 tests, 29 pass, 0 fail. Covers confirmation (no recommendation call while ambiguous), confirmed IDs only, unresolved names, budget exhaustion (partial, exact `notFetched`, never above 8 requests), per-result provenance, absent popularity and affinity, no silent fallback (network error, missing key), malformed bodies, enrichment failure, adapt states, palette contrast.
- `npx next build`: compiled successfully (`/api/run`, `/api/show`, `/api/health`).
- Browser check, sample mode, 390 px (Playwright/Chromium): confirm button disabled until a choice is made; no results before confirmation; Cancel shows the cancelled notice; confirming shows results; popularity note and the receipt render; a show without popularity shows no popularity; no horizontal overflow; no JS errors. Not a keyboard or screen-reader audit.

## Blockers and open items

- **Qloo key not available in this environment.** No live call has been made. Unverified against real responses: `/search` `types` filter (a comma-separated type list may 400), the explainability payload (only a plain string is kept), the demographics and compare response shapes, `popularity` field name and range.
- **Live smoke test (needs `QLOO_API_KEY`):** search ambiguity on real names, insights for podcasts with 3 different seeds, demographics, compare. Fix parsers to match; record findings here.
- A confirmed ID is accepted from the client after a format check only (no server-side re-verification against the candidates).
- `RECORDED` mode is reserved but not implemented.
- Not done yet: per-IP rate limit, Vercel deploy, JEV review (P1), Devpost text.
- Release requirement: the repository must be public with a visible license. Visibility is unverified; check manually before submitting.
- Podcast coverage in Qloo is unknown; fallback idea is `urn:entity:book`.

## Visual direction (listening room) - 1 of max 5 iterations used

Implemented: dark forest frame, ivory surfaces, serif display + sans UI, generated abstract artwork (`components/art.tsx`), cobalt route lines, desktop shell (dark nav, hero, brief card, top-3 rows, "Proof, not promise." evidence panel, pitch sheet) and the three mobile screens (Discover, Receipt, Pitch) with icon-first bottom nav. Shortlists and Receipts views list the current run only; saving shortlists is not implemented.

Validation (actual runs):
- `npx tsc --noEmit`: pass. `npm test`: 41 tests, 41 pass. `npx next build`: compiled successfully.
- Browser check with Playwright/Chromium against a local mock Qloo server (live mode) and sample mode, desktop 1440x900 and mobile 390x844: loading, results, evidence available, evidence unavailable (compare 500), unresolved, degraded, confirmation, empty and SAMPLE states rendered; mobile receipt shows 3 chips; no send/email control; no horizontal overflow; no JS errors; no mobile control under 44px. The full run was repeated on the final build (after the 44px ring-digit change) with the same results: overflow false on desktop and mobile, 0 JS errors, 3 mobile chips, 0 send/email controls, 0 mobile targets under 44px.
- Screenshots are local only (not committed): scratchpad `shots/` (desktop and mobile, 12 states each).
- Not done: keyboard-only and screen-reader pass, dark-mode, real Qloo data (descriptions and themes come from unverified response shapes), image assets from the approved mockup (artwork is generated, not copied).

## Iteration 2: production readiness (1 iteration)

Live smoke: **blocked: missing QLOO_API_KEY**. `npm run smoke:qloo` printed `blocked: missing QLOO_API_KEY` and exited 2. No key was requested or created, and no Qloo request was made.

Contract facts, with their evidence level:
- Verified live: none.
- Documented in the official `@qloo/qloo-harness@0.1.26` source (read statically, never executed; not live-verified):
  - Auth header `X-Api-Key`; base URL for this event `https://hackathon.api.qloo.com`.
  - `results` is either the array itself or an object keyed by kind (`results.entities`, `results.tags`, `results.demographics`).
  - Entity ids are `entity_id` (or `id`); `name` is a string; `popularity` is a top-level number.
  - Description may be at `short_description`, `description`, `properties.short_description` or `properties.description`.
  - Affinity is `query.affinity` (also `affinity` or `score` on tags).
- Unverified (smoke test will answer): the multi-type `/search` `types` list, the explainability payload (`query.explainability`), whether `filter.popularity.max` is honored (the app does not send it), exact demographics and compare shapes, rate-limit header names and values.

Changes:
- `lib/smoke.ts`, `scripts/smoke-qloo.ts`, `npm run smoke:qloo`, `.env.example` note.
- `lib/qloo.ts`: parsers accept both documented container forms and all four description paths; empty demographics is `empty`, not `ok`. Missing description, themes, popularity, demographics and compare stay explicit in the UI; optional enrichments never block the shortlist or the pitch draft.
- `lib/rate-limit.ts`, `lib/guard.ts`, wired into `/api/run` and `/api/show`; typed `rate_limited` state in `adapt.ts` and the UI (retry guidance); enrichment shows "rate_limited, retry in Ns".

Validation (actual runs):
- `npx tsc --noEmit`: pass. `npm test`: 58 tests, 58 pass (new: smoke redaction and structure, rate limiter, guard 429, live-shape adaptation, missing optional fields, rate_limited adaptation). `npx next build`: compiled successfully.
- Runtime check on the built server (sample mode): 6 requests to `/api/run` from one IP returned 200, the 7th returned 429 with `Retry-After: 60` and the typed body; a different IP and `/api/show` were unaffected.
- The visual system was not changed.

Remaining before submission (not done here):
1. Obtain a Qloo key via the event process, export it locally, run `npm run smoke:qloo`, and fix any parser or request assumption it flags (multi-type search, podcast coverage, explainability, popularity param).
2. Run the app against live Qloo with 3 different briefs; check descriptions, themes and affinities render sensibly.
3. Choose and configure hosting (for example Vercel) with server-only `QLOO_API_KEY`, `QLOO_MODE=live`, `QLOO_BASE_URL`; deploy; confirm `/api/health` shows the expected sha, mode and `key_present`. The in-memory limiter is per instance there.
4. Verify the repository is public with the MIT license visible in the About panel (visibility is unverified).
5. Keyboard-only and screen-reader pass.
6. Devpost: description, testing instructions with the demo URL, screenshots with live data, English only; submit before the deadline (2026-10-30 23:45 EDT).

## Iteration 3: first live verification (2026-10-30)

Key loaded from `.env.local` by the shell; never printed. `npm run smoke:qloo` (run with `node --env-file=.env.local`): 8 pass, 0 fail, 0 skipped.

Verified live:
- `/search` accepts the four-type `types` list; `entity_id`, `name`, `popularity` and `properties.description` are present. Search is fuzzy: a nonsense name still returns 5 candidates, so the confirmation step is the guard.
- `/v2/insights` podcast results: `results.entities[]` with `entity_id`, `name`, `popularity`, `query.affinity`, `properties.description`/`short_description`. `query.explainability` was not returned in the runs made, so explanation stays absent.
- A seed Qloo cannot use as a signal gives HTTP 400 ("All of the provided signal.interests.entities were invalid") when it is the only seed. With several seeds Qloo answers 200 and lists the dropped ones under the literal warning key `signal.interests.entities`.
- Adding `filter.popularity.max` to a request with only unusable seeds returns 200: the seed is ignored, so that filter must not be used as evidence of personalised results.
- Demographics: age and gender maps returned. Compare: `results.tags` shape matches the parser; it was empty for the pair tried.

Changes:
- `lib/qloo.ts`: parser accepts `id` as well as `entity_id`; a 400 on `signal.interests.entities` is the typed `seed_not_usable`; seeds named in warnings are returned as `ignoredSeedIds`.
- `lib/run.ts`, `lib/ui/*`, `app/page.tsx`, `components/run-states.tsx`: `ignoredSeeds` is shown as a notice next to the results; `seed_not_usable` has its own message.
- `lib/smoke.ts`: seeds insights from the first search hit that works; the popularity and empty-search checks are informational.

Validation: `npm run typecheck` pass; `npm test` 61 of 61 pass; live run through `executeRun` returned `ok` with 20 podcasts, a bad seed reported as ignored, and `seed_not_usable` for an all-bad seed.

Still open: three or more live briefs checked by eye, browser pass against live data, hosting and env setup, public repo check, Devpost text.
