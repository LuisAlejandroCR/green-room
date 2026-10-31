// body.ts: bounded JSON body parsing and field cleaning shared by the POST routes. Never throws.
const MAX_BODY = 64 * 1024;
export const MAX_FIELD = 200;

export async function readJson(req: Request): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; res: Response }> {
  const text = await req.text();
  if (text.length > MAX_BODY) return { ok: false, res: Response.json({ error: "too_large" }, { status: 413 }) };
  try {
    const body: unknown = JSON.parse(text);
    if (typeof body !== "object" || body === null || Array.isArray(body)) throw new Error("not an object");
    return { ok: true, body: body as Record<string, unknown> };
  } catch {
    return { ok: false, res: Response.json({ error: "bad_json" }, { status: 400 }) };
  }
}

export const clean = (v: unknown, max = MAX_FIELD): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
export const cleanList = (v: unknown, n: number, max = MAX_FIELD): string[] =>
  (Array.isArray(v) ? v : []).map((x) => clean(x, max)).filter(Boolean).slice(0, n);
