// route.ts (/api/review): re-check an edited pitch with the same deterministic checks and JEV questions.
import { clean, cleanList, readJson } from "@/lib/body";
import { limitRequest } from "@/lib/guard";
import { reviewPitch } from "@/lib/jev";
import { pitchEvidence } from "@/lib/pitch";

const MODES = ["live", "recorded", "sample"] as const;

export async function POST(req: Request) {
  const limited = limitRequest(req, "agent");
  if (limited) return limited;
  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.res;
  const b = parsed.body;
  const text = clean(b.text, 4000);
  const show = clean(b.show);
  if (!text || !show) return Response.json({ error: "text_required" }, { status: 400 });
  const evidence = pitchEvidence({
    work: clean(b.work) || "my guest's work", show,
    showTopics: cleanList(b.showTopics, 6, 60), sharedThemes: cleanList(b.sharedThemes, 6, 60), workTaste: cleanList(b.workTaste, 8, 60),
  });
  return Response.json({ review: await reviewPitch({ claim: text, evidence, sourceMode: MODES.find((m) => m === b.sourceMode) ?? "live" }) });
}
