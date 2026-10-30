import { markTies, recommendPodcasts, REACH_MAX, searchEntity, type Reach } from "@/lib/qloo";

const MAX_BODY = 64 * 1024;
const MAX_FIELD = 200;

export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > MAX_BODY) return Response.json({ error: "too_large" }, { status: 413 });
  let body: { work?: unknown; seeds?: unknown; reach?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "bad_json" }, { status: 400 });
  }
  const clean = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, MAX_FIELD) : "");
  const work = clean(body.work);
  const seedNames = (Array.isArray(body.seeds) ? body.seeds : []).map(clean).filter(Boolean).slice(0, 3);
  const reach: Reach = body.reach === "reachable" || body.reach === "dream" ? body.reach : "stretch";
  if (!work) return Response.json({ error: "work_required" }, { status: 400 });

  // Resolve names; ambiguity is returned to the user instead of guessed.
  const names = [work, ...seedNames];
  const resolved = await Promise.all(names.map((n) => searchEntity(n, "urn:entity:book,urn:entity:brand,urn:entity:movie,urn:entity:artist")));
  const failed = resolved.find((r) => r.status === "degraded");
  if (failed) return Response.json({ status: "degraded", mode: failed.mode, error: failed.error });
  const unresolved = names.filter((_, i) => !resolved[i].data?.length);
  if (unresolved.length) return Response.json({ status: "empty", unresolved });

  const ids = resolved.map((r) => r.data![0].id);
  const rec = await recommendPodcasts({ seedEntityIds: ids, popularityMax: REACH_MAX[reach] });
  return Response.json({
    ...rec,
    data: rec.data ? markTies(rec.data) : null,
    resolved: resolved.map((r, i) => ({ asked: names[i], matched: r.data![0].name })),
  });
}
