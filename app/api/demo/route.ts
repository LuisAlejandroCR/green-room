// The demo is selected only by an explicit client action; it never falls back from Qloo.
import { executeDemo } from "@/lib/demo";

const MAX_BODY = 64 * 1024;
const MAX_FIELD = 200;

export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > MAX_BODY) return Response.json({ error: "too_large" }, { status: 413 });
  let body: { work?: unknown; seeds?: unknown; confirmed?: unknown };
  try { body = JSON.parse(text); } catch { return Response.json({ error: "bad_json" }, { status: 400 }); }

  const clean = (value: unknown) => typeof value === "string" ? value.trim().slice(0, MAX_FIELD) : "";
  const work = clean(body.work);
  const seeds = (Array.isArray(body.seeds) ? body.seeds : []).map(clean).filter(Boolean).slice(0, 3);
  if (!work) return Response.json({ error: "work_required" }, { status: 400 });
  const confirmed = typeof body.confirmed === "object" && body.confirmed !== null
    ? Object.fromEntries(Object.entries(body.confirmed).flatMap(([name, id]) => {
      const cleanName = clean(name);
      return cleanName && typeof id === "string" ? [[cleanName, id]] : [];
    }).slice(0, 4))
    : {};

  return Response.json(executeDemo({ work, seeds, confirmed }));
}
