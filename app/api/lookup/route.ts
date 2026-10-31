// route.ts (/api/lookup): is a podcast name known to Qloo? Used to check the model-only baseline's names on the desk.
// One Qloo /search request (podcast type, top 3). The answer is Qloo's matches; the UI never treats them as the same
// show without showing their names.
import { limitRequest } from "@/lib/guard";
import { createBudget, searchEntity } from "@/lib/qloo";

export async function GET(req: Request) {
  const limited = limitRequest(req, "desk");
  if (limited) return limited;
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 120);
  if (q.length < 2) return Response.json({ error: "query_too_short" }, { status: 400 });
  const budget = createBudget(1);
  const found = await searchEntity(q, "urn:entity:podcast", budget);
  return Response.json({ lookup: { ...found, data: found.data?.slice(0, 3) ?? null }, budget: { used: budget.used, max: budget.max } });
}
