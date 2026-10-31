// route.ts (/api/baseline): the same brief answered by the model alone, without Qloo, for a neutral side-by-side on
// the web desk. Names are unverified and carry no scores.
import { baselineGuess } from "@/lib/agent";
import { clean, cleanList, readJson } from "@/lib/body";
import { limitRequest } from "@/lib/guard";

export async function POST(req: Request) {
  const limited = limitRequest(req, "agent");
  if (limited) return limited;
  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.res;
  const work = clean(parsed.body.work);
  if (!work) return Response.json({ error: "work_required" }, { status: 400 });
  return Response.json({ baseline: await baselineGuess(work, cleanList(parsed.body.seeds, 3)) });
}
