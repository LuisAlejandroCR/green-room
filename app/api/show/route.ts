import { audienceOf, createBudget, sharedAngles } from "@/lib/qloo";
import { validId } from "@/lib/run";

// Optional enrichment: always 200 with per-part envelopes so a failure never blocks the shortlist or pitch.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const work = url.searchParams.get("work");
  const show = url.searchParams.get("show");
  if (!validId(work) || !validId(show)) return Response.json({ error: "missing_params" }, { status: 400 });
  const budget = createBudget();
  const audience = await audienceOf(show, budget);
  const angles = await sharedAngles(work, show, budget);
  return Response.json({ audience, angles, budget: { used: budget.used, max: budget.max } });
}
