# AGENTS.md

Rules for any agent working in this repo.

- Public repo with MIT license (hackathon requirement). English only in UI, docs and commits.
- All Qloo access goes through `lib/qloo.ts`. It never throws; it returns `{status, mode, source, checked_at, data, error}`.
- The key lives only in server env (`QLOO_API_KEY`). No `NEXT_PUBLIC_*`, never logged, never committed.
- Send Qloo only allowed params per `filter.type` (it silently ignores the rest); `take` <= 50.
- Never fabricate results. Sample data must be labeled `SAMPLE · Not Qloo data`. Qloo down => typed degraded result, never a 500.
- Do not commit real Qloo responses to the repo.
- Green Room drafts pitches; it never sends email.
- Markdown files: this file, `PROGRESS.md`, and the root `README.md` only.
