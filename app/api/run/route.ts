import { executeRun, validId } from "@/lib/run";

const MAX_BODY = 64 * 1024;
const MAX_FIELD = 200;

export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > MAX_BODY) return Response.json({ error: "too_large" }, { status: 413 });
  let body: { work?: unknown; seeds?: unknown; confirmed?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "bad_json" }, { status: 400 });
  }
  const clean = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, MAX_FIELD) : "");
  const work = clean(body.work);
  const seeds = (Array.isArray(body.seeds) ? body.seeds : []).map(clean).filter(Boolean).slice(0, 3);
  if (!work) return Response.json({ error: "work_required" }, { status: 400 });
  const confirmed: Record<string, string> = {};
  if (typeof body.confirmed === "object" && body.confirmed !== null) {
    for (const [name, id] of Object.entries(body.confirmed).slice(0, 4)) {
      if (validId(id)) confirmed[name.slice(0, MAX_FIELD)] = id;
    }
  }
  return Response.json(await executeRun({ work, seeds, confirmed }));
}
