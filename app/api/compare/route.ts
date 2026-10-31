// route.ts (/api/compare): side-by-side for 2 or 3 shows. The shortlist is ranked in ONE Qloo request
// (filter.results.entities), so its affinities are comparable; audience and shared themes are optional per show.
// At most 1 + 3 + 3 = 7 Qloo requests.
import { limitRequest } from "@/lib/guard";
import { audienceOf, createBudget, recommendPodcasts, sharedAngles } from "@/lib/qloo";
import { validId } from "@/lib/run";

export async function GET(req: Request) {
  const limited = limitRequest(req, "desk");
  if (limited) return limited;
  const url = new URL(req.url);
  const seeds = (url.searchParams.get("seeds") ?? "").split(",").filter(validId).slice(0, 4);
  const shows = (url.searchParams.get("shows") ?? "").split(",").filter(validId).slice(0, 3);
  const work = url.searchParams.get("work");
  if (!seeds.length || shows.length < 2) return Response.json({ error: "missing_params" }, { status: 400 });
  const budget = createBudget();
  const ranking = await recommendPodcasts({ seedEntityIds: seeds, resultIds: shows }, budget);
  const audience: Record<string, unknown> = {};
  const angles: Record<string, unknown> = {};
  for (const id of shows) {
    audience[id] = await audienceOf(id, budget);
    angles[id] = validId(work) ? await sharedAngles(work, id, budget) : { status: "empty", data: [] };
  }
  const { ignoredSeedIds: _i, influence: _f, ...rank } = ranking;
  return Response.json({ ranking: rank, audience, angles, budget: { used: budget.used, max: budget.max } });
}
