import { audienceOf, sharedAngles } from "@/lib/qloo";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const work = (url.searchParams.get("work") ?? "").slice(0, 200);
  const show = (url.searchParams.get("show") ?? "").slice(0, 200);
  if (!work || !show) return Response.json({ error: "missing_params" }, { status: 400 });
  const [audience, angles] = await Promise.all([audienceOf(show), sharedAngles(work, show)]);
  return Response.json({ audience, angles });
}
