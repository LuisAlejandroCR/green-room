// route.ts (/api/tags): Qloo tag search for the suggested chips on the phone. One Qloo request.
import { limitRequest } from "@/lib/guard";
import { createBudget, searchTags } from "@/lib/qloo";

export async function GET(req: Request) {
  const limited = limitRequest(req, "desk");
  if (limited) return limited;
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < 3) return Response.json({ error: "query_too_short" }, { status: 400 });
  const budget = createBudget();
  return Response.json({ tags: await searchTags(q, budget), budget: { used: budget.used, max: budget.max } });
}
