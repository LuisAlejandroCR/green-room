// Explicit deterministic demo. It is isolated from Qloo and never runs as a fallback.
import { SAMPLE_PODCASTS, sampleSearch } from "@/lib/samples";

const MAX_BODY = 64 * 1024;
const MAX_FIELD = 200;
const RETRIEVED_AT = "2026-10-31T00:00:00.000Z";
const QUERY_ID = "demo_fixture_v1";

export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > MAX_BODY) return Response.json({ error: "too_large" }, { status: 413 });
  let body: { work?: unknown; seeds?: unknown; confirmed?: unknown };
  try { body = JSON.parse(text); } catch { return Response.json({ error: "bad_json" }, { status: 400 }); }

  const clean = (value: unknown) => typeof value === "string" ? value.trim().slice(0, MAX_FIELD) : "";
  const work = clean(body.work);
  const seeds = (Array.isArray(body.seeds) ? body.seeds : []).map(clean).filter(Boolean).slice(0, 3);
  if (!work) return Response.json({ error: "work_required" }, { status: 400 });

  const confirmed = typeof body.confirmed === "object" && body.confirmed !== null
    ? Object.fromEntries(Object.entries(body.confirmed).filter(([name, id]) => clean(name) && typeof id === "string").slice(0, 4))
    : {};
  const names = [work, ...seeds.filter((seed) => seed !== work)];
  const candidates = names.flatMap((name) => confirmed[name] ? [] : sampleSearch(name).length > 1
    ? [{ name, options: sampleSearch(name) }]
    : []);

  const base = {
    mode: "sample" as const, workId: null, resolved: names.map((name) => ({ name, id: confirmed[name] ?? sampleSearch(name)[0].id })),
    candidates, unresolved: [], notFetched: [], ignoredSeeds: [], budget: { used: 0, max: 8 },
  };
  if (candidates.length) return Response.json({ ...base, state: "needs_confirmation", results: [] });

  return Response.json({
    ...base,
    state: "ok",
    results: SAMPLE_PODCASTS.map((show) => ({
      id: show.id, name: show.name, description: show.description, mode: "sample" as const,
      provenance: {
        entityId: show.id, queryId: QUERY_ID, source: "Synthetic demo fixture · no Qloo request",
        retrievedAt: RETRIEVED_AT, affinity: show.affinity, ...(show.popularity === undefined ? {} : { popularity: show.popularity }),
      },
    })),
  });
}
