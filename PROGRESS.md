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

## Iteration 4: editorial redesign from the two reference boards (2026-10-31)

UI only; no change to endpoints, Qloo rules, budgets or data handling. Added: self-hosted fonts (`app/fonts`), `app/icon.svg`, `components/{sidebar,campaign,progress}.tsx`; the ring (`components/affinity.tsx`) replaced the earlier figure-and-rule. Search, filters, tabs, "Why this match?" and a mobile bottom bar were deliberately not built because nothing behind them exists. Match themes show only on the selected match (the only one with enrichment). Shortlists and Receipts list the current run only.

Validation (actual runs, sample mode): typecheck pass; `npm test` 71 of 71; `npm run build` ok. E2E (`artifacts/e2e/scripts`): web 1280x800 PASS; Android 14 emulator (Chrome 113, 391 css px) PASS with the soft keyboard, 44px touch targets, no horizontal overflow and no focused field under the action bar. Not verified: live-data rendering of the new screens, screen reader and keyboard-only passes, devices other than the emulator.

## Iteration 5: vivid web + Android redesign on live data (2026-10-31) - spec

Goal: rebuild the web and the Android (mobile web) experience from the two reference boards. Android goes straight to the point with no jargon, motion, colour and real images. Data is real (live Qloo); one explicit demo button runs a ready-made brief against live Qloo.

Gaps filled, from `qloo-knowledge-base` and the smoke run of 2026-10-31 (8 pass):
- Real images: Qloo returns `properties.image.url` for podcasts and for `/search` hits; the app ignored it. Covers show on every match and on the "pick your book" step; generated art is the fallback when Qloo has no image.
- Real topics per show: podcast entities carry `tags[].name`; shown as the show's topics without an extra request. Shared themes from compare stay as an optional extra.
- Show facts: `properties.channel` and `episode_count` when present; absent stays absent.
- Influence: `query.explainability` returns, per seed, its effect on the top results; the desktop evidence panel names which of your picks shaped the list. Not shown on mobile.
- Save locally (BRAINSTORM P1): bookmark a match, "Saved" lists it on this device (localStorage), no account.
- Demo: the button now runs a fixed, pre-confirmed brief against live Qloo instead of synthetic fixtures. Sample mode stays only for `QLOO_MODE=sample`, labelled SAMPLE.

Acceptance:
1. Live mode: a typed brief and the demo button both return real podcasts with cover images, topics and affinity; nothing synthetic is shown as real.
2. Mobile (<1024px): five screens (Start, Pick, Matches, Why it fits, Pitch) plus Saved; plain words (no "affinity", "entity", "seed", "Qloo index"); animated entry, ring and cards; honours `prefers-reduced-motion`; 44px targets; no horizontal overflow.
3. Desktop (>=1024px): dark sidebar, campaign card, ranked rows with covers, dark "Proof, not promise." panel with source, retrieval time, popularity note and influence.
4. Rules in AGENTS.md hold: provenance on every result, no silent ID choice, no fallback to sample, never sends email.
5. `npm run typecheck`, `npm test`, `npm run build` pass; browser check at 1280 and 390 against live data.

### Iteration 5 - validation (actual runs, 2026-10-31)

- `npm run smoke:qloo` (live key from `.env.local`, never printed): 8 pass. New paths seen: `properties.image.url` on podcasts and search hits, `properties.channel`, `properties.episode_count`, `tags[].name`, top-level `query.explainability.signal.interests.entities.effect_on_top10_recs[]`.
- Live finding: names can arrive HTML-escaped (`&amp;`); the parser now decodes them as plain text. Every podcast carries the tag "Podcasts"; it is dropped as noise.
- Live finding: several book editions are not usable as a signal (Atomic Habits main editions, Sapiens); the run reports them as ignored. The demo uses the Atomic Habits bundle that Qloo accepts plus Nike Training Club: 20 podcasts, 0 ignored, influence returned for both picks.
- `npm run typecheck`: pass. `npm test`: 91 of 91 (new: cover, decoding and topics; influence; search candidate kind/detail/cover; demo brief is fully confirmed; contrast for every vibe colour and the demo gradient). `npm run build`: compiled.
- Browser (live mode, dev server): phone 390x844 - Start, demo run, Matches with real covers, Why it fits with live audience bars, Your pitch, typed brief "Interstellar" + "Patagonia" through "Which one did you mean?" with real covers, save and Saved; no horizontal overflow; 0 controls under 44px. Desktop 1280x800 - demo run, campaign card, ranked rows, evidence panel with source, retrieval, LIVE badge, popularity note and influence, Pitch Studio sheet. No console errors from the app.
- Removed: the synthetic `/api/demo` route (the demo is live now), `components/{brief-form,matches,receipt,campaign,sidebar,progress,nav,affinity}.tsx`, `components/ui/skeleton.tsx`.
- Not verified: a real Android device or emulator for this iteration, screen reader and keyboard-only passes, deployed hosting. Shared themes from compare stayed empty for the briefs tried; the UI shows the show's own Qloo topics instead and labels them as such.

## Iteration 6: web campaign desk, phone swipe deck, native Android app (2026-10-31)

Spec: split the product into a web campaign desk (>=1024px) and a phone swipe flow, and ship Android as an Expo app built as an APK (the user's choice: native React Native screens, not a WebView or TWA). Acceptance: live Qloo data everywhere, 3 picks on the phone in under 60 s, no server key in the APK, typecheck/tests/build green.

Done:
- Web desk: sortable matches table with topic filter (kept in the URL, Esc clears), comparator for 2-3 shows in one Qloo request, influence (what changes without each pick), US heatmap of a show's fans, model-only baseline side by side, CSV and HTML report export with provenance.
- Pitch Studio: Claude (`claude-sonnet-5-5`) drafts from the evidence only; JEV (`jev-1.14.0`) reviews it.
- IDs confirmed in the browser are re-verified on the server with `/entities`; the work's taste analysis is shown; a labelled RECORDED tour exists (stored in `.env.local`, not committed).
- Phone web: swipe deck with real covers, "More like this" (a show's topic as a tag signal), "Your 3 picks" with Copy pitch and Share.
- Android (`android-app/`): native screens calling the deployed `/api/run` and `/api/show`; `eas.json` profile `preview` with `buildType: "apk"`; package `com.luisalejandrocr.greenroom`; API base `https://app-green-room.vercel.app` via `EXPO_PUBLIC_API_BASE`.
- CI: `.github/workflows/ci.yml` (web typecheck, tests, build; Android typecheck, expo-doctor, Metro bundle).

Validation (actual runs):
- `npm run typecheck` pass; `npm test` 117 of 117 (7 new for the Android helpers: demo brief and pitch identical to the web, API base, seeds, fit, deck states, show facts); `npm run build` compiled.
- Browser, live Qloo: phone 390x844 from tapping the example to 3 saved picks in 18.6 s, no horizontal overflow, no control under 48px; desktop 1280x800 desk features exercised.
- Android: `npx tsc --noEmit` pass; `expo-doctor` 20/20; `expo export -p android` bundled (1.6 MB Hermes) with the deployed URL inlined and no `QLOO_API_KEY`, `JEV_API_KEY` or `ANTHROPIC` string in the bundle.
- Deployed API probed with the demo brief: `/api/run` 200 `ok`/`live`, 20 podcasts with covers; `/api/show` 200 (audience returned, shared themes empty for that pair).

Findings:
- Trending returned no podcast data live, so there is no trending sparkline.
- Demographics ages are relative lift (can be negative), not audience shares; the Android facts sheet says "Ages that lean in most".
- A preview server that inherits `ANTHROPIC_API_KEY` from its parent shell overrides `.env.local` and Claude calls fail with `auth_failed`; start the server from a clean shell.

Not verified: the APK build itself (needs the owner's `eas login`), the app on a real Android device, screen reader and keyboard-only passes, repository visibility.

## Devpost text (draft, English)

**Green Room** finds the podcasts whose listeners already love what you made, shows the Qloo evidence behind every match, and drafts a pitch you edit. It never sends anything.

**What it does.** Type a book, film or brand (and optionally what its fans also love). Green Room resolves each name with Qloo search, asks you to pick when a title is ambiguous, and asks Qloo Insights for podcasts whose audiences share that taste. Every result carries its receipt: Qloo entity id, query id, retrieval time and affinity. On the web, a campaign desk lets you sort and filter matches, compare shows, see which of your picks shaped the list, map where a show's fans are, and set Qloo's answer beside a model-only guess. On a phone, and in the native Android app, you swipe through real matches and keep three, each with a ready pitch to copy or share.

**How we built it.** Next.js on Vercel with server-only keys; Qloo `/search`, `/v2/insights`, `/v2/analysis/compare` and `/entities`; a request budget of 8 Qloo calls per run; Claude drafts pitches only from the Qloo evidence and JEV reviews each draft against it. The Android app is Expo / React Native, built as an APK with EAS, and talks only to our API.

**Honesty rules.** No silent entity choice, no sample data shown as real, popularity never used as a reach claim, absent fields stay absent, and nothing is ever sent on your behalf.

**Try it.** https://app-green-room.vercel.app - tap "See a real example". Android: install the APK from the EAS link in the submission.
