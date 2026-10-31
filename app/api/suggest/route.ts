// route.ts (/api/suggest): Claude suggests which candidate a typed name most likely means (call 1 of 2).
// The answer is only a hint shown next to the options; the person still picks, and the server re-verifies the pick.
import { suggestCandidate } from "@/lib/agent";
import { clean, cleanList, readJson } from "@/lib/body";
import { limitRequest } from "@/lib/guard";
import { validId } from "@/lib/run";

export async function POST(req: Request) {
  const limited = limitRequest(req, "agent");
  if (limited) return limited;
  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.res;
  const b = parsed.body;
  const name = clean(b.name);
  const options = (Array.isArray(b.options) ? b.options : []).slice(0, 5).flatMap((o) => {
    const r = typeof o === "object" && o !== null ? (o as Record<string, unknown>) : {};
    const id = r.id;
    return validId(id) && clean(r.name)
      ? [{ id, name: clean(r.name), kind: clean(r.kind) || undefined, detail: clean(r.detail) || undefined, tags: cleanList(r.tags, 4, 60) }]
      : [];
  });
  if (!name || options.length < 2) return Response.json({ error: "missing_params" }, { status: 400 });
  return Response.json({ suggestion: await suggestCandidate({ name, context: cleanList(b.context, 4), options }) });
}
