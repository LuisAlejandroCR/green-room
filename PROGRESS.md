# PROGRESS

Deadline: 2026-10-30 23:45 EDT (22:45 Bogota). Code freeze 18:30, submit 20:45 Bogota.

## Done
- Next.js skeleton, `/api/health`, `/api/run` (seeds are entity ids for now)
- `lib/qloo.ts`: typed envelope, param allow-list, sample mode
- UI base: Tailwind v4, shadcn-style primitives, mode/tier badges, show detail panel, deterministic pitch draft, `/api/show`; palette contrast asserted in `tests/contrast.test.ts`

## Next
- Request Qloo key (Devpost + form + #api-help) and smoke test: insights podcast, popularity.max, demographics, compare, trending
- `/search` name resolution, tools catalog, bounded agent loop, verify-answer
- UI, rate limit per IP, deploy to Vercel, Devpost text

## Open
- Podcast coverage in Qloo; fallback is `urn:entity:book`
