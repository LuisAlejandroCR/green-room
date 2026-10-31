// route.ts (/api/heatmap): where a show's taste audience concentrates in the United States. One Qloo request.
import { limitRequest } from "@/lib/guard";
import { createBudget, heatmapOf } from "@/lib/qloo";
import { validId } from "@/lib/run";

export async function GET(req: Request) {
  const limited = limitRequest(req, "desk");
  if (limited) return limited;
  const show = new URL(req.url).searchParams.get("show");
  if (!validId(show)) return Response.json({ error: "missing_params" }, { status: 400 });
  const budget = createBudget();
  const env = await heatmapOf(show, budget);
  // Rounded for transfer size only; the order and values are Qloo's.
  const data = env.data?.map((c) => ({ lat: Math.round(c.lat * 100) / 100, lon: Math.round(c.lon * 100) / 100, affinity: Math.round(c.affinity * 1000) / 1000 })) ?? null;
  return Response.json({ heatmap: { ...env, data }, budget: { used: budget.used, max: budget.max } });
}
