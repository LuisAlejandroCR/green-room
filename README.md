# Green Room

An agent that finds the podcasts whose listeners already share your guest's taste, and drafts the pitch. Built for the Qloo Agentic Hackathon.

Every number on screen comes from Qloo's taste graph (`https://hackathon.api.qloo.com`). The model plans calls and writes prose; code enforces reach caps, exclusions and ties.

## Run

```bash
cp .env.example .env.local   # QLOO_MODE=sample works without a key
npm install
npm run dev
npm test
```

Set `QLOO_API_KEY` and `QLOO_MODE=live` for real Qloo calls. The key is server-only. `GET /api/health` reports `{sha, mode, key_present}`.

## Status

Skeleton: typed Qloo client (`lib/qloo.ts`), labeled sample mode, `/api/run`, `/api/health`. See `PROGRESS.md`.

License: MIT
