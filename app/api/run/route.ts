import { recommendPodcasts } from "@/lib/qloo";

const MAX_BODY = 64 * 1024;

export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > MAX_BODY) return Response.json({ error: "too_large" }, { status: 413 });
  let body: { seeds?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "bad_json" }, { status: 400 });
  }
  const seeds = Array.isArray(body.seeds)
    ? body.seeds.filter((s): s is string => typeof s === "string").slice(0, 3)
    : [];
  // TODO: resolve names -> entity ids via /search; for now seeds are entity ids.
  return Response.json(await recommendPodcasts({ seedEntityIds: seeds, popularityMax: 0.5 }));
}
