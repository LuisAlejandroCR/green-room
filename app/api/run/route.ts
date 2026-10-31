// route.ts (/api/run): one brief -> resolve, confirm, re-verify, recommend. Optional tag ids add a taste signal.
import { clean, cleanList, MAX_FIELD, readJson } from "@/lib/body";
import { limitRequest } from "@/lib/guard";
import { executeRun, validId } from "@/lib/run";

export async function POST(req: Request) {
  const limited = limitRequest(req, "run");
  if (limited) return limited;
  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.res;
  const body = parsed.body;
  const work = clean(body.work);
  const seeds = cleanList(body.seeds, 3);
  if (!work) return Response.json({ error: "work_required" }, { status: 400 });
  const confirmed: Record<string, string> = {};
  if (typeof body.confirmed === "object" && body.confirmed !== null) {
    for (const [name, id] of Object.entries(body.confirmed).slice(0, 4)) {
      if (validId(id)) confirmed[name.slice(0, MAX_FIELD)] = id;
    }
  }
  const tags = cleanList(body.tags, 3).filter(validId);
  return Response.json(await executeRun({ work, seeds, confirmed, tags }));
}
