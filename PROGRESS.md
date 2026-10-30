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
