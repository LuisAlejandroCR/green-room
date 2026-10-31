// route.ts (/api/influence): "with and without each pick". The IDs are re-verified (1 request), the full list is
// fetched again (1) and once without each pick (1 per pick, at most 4): at most 6 Qloo requests. Only membership of
// the top 10 is compared, never scores across requests.
import { cleanList, readJson } from "@/lib/body";
import { limitRequest } from "@/lib/guard";
import { createBudget, entitiesById, recommendPodcasts, type PodcastResult } from "@/lib/qloo";
import { validId } from "@/lib/run";

const top = (r: PodcastResult[] | null) => (r ?? []).slice(0, 10);

export async function POST(req: Request) {
  const limited = limitRequest(req, "desk");
  if (limited) return limited;
  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.res;
  const names = cleanList(parsed.body.names, 4);
  const ids = cleanList(parsed.body.ids, 4).filter(validId);
  if (ids.length < 2 || ids.length !== names.length) return Response.json({ error: "need_two_picks" }, { status: 400 });
  const budget = createBudget();
  const check = await entitiesById(ids, budget);
  const known = new Set((check.data ?? []).map((e) => e.id));
  if (check.status !== "ok" || ids.some((id) => !known.has(id))) {
    return Response.json({ state: "unverified", error: check.error ?? "id_not_verified", budget: { used: budget.used, max: budget.max } });
  }
  const full = await recommendPodcasts({ seedEntityIds: ids }, budget);
  if (full.status !== "ok") return Response.json({ state: full.status, error: full.error, budget: { used: budget.used, max: budget.max } });
  const base = top(full.data);
  const without = [];
  for (const [i, name] of names.entries()) {
    const rest = ids.filter((_, j) => j !== i);
    const env = await recommendPodcasts({ seedEntityIds: rest }, budget);
    if (env.status !== "ok") {
      without.push({ name, state: env.status, error: env.error });
      continue;
    }
    const alt = top(env.data);
    const altIds = new Set(alt.map((p) => p.id));
    const baseIds = new Set(base.map((p) => p.id));
    without.push({
      name,
      state: "ok",
      queryId: env.queryId,
      kept: base.filter((p) => altIds.has(p.id)).length,
      left: base.filter((p) => !altIds.has(p.id)).map((p) => p.name),
      entered: alt.filter((p) => !baseIds.has(p.id)).map((p) => p.name),
    });
  }
  return Response.json({ state: "ok", mode: full.mode, queryId: full.queryId, retrievedAt: full.retrievedAt, topCount: base.length, without, budget: { used: budget.used, max: budget.max } });
}
