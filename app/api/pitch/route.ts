// route.ts (/api/pitch): Claude drafts the pitch from Qloo evidence (call 2 of 2), then JEV reviews it. Without a
// Claude key the deterministic template is used and labelled as such; JEV still reviews whichever draft is shown.
import { agentConfigured, AGENT_MODEL, draftPitchWithClaude } from "@/lib/agent";
import { clean, cleanList, readJson } from "@/lib/body";
import { limitRequest } from "@/lib/guard";
import { reviewPitch } from "@/lib/jev";
import { draftPitch, pitchEvidence } from "@/lib/pitch";

const MODES = ["live", "recorded", "sample"] as const;

export async function POST(req: Request) {
  const limited = limitRequest(req, "agent");
  if (limited) return limited;
  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.res;
  const b = parsed.body;
  const e = {
    work: clean(b.work) || "my guest's work",
    show: clean(b.show),
    showTopics: cleanList(b.showTopics, 6, 60),
    sharedThemes: cleanList(b.sharedThemes, 6, 60),
    workTaste: cleanList(b.workTaste, 8, 60),
  };
  if (!e.show) return Response.json({ error: "show_required" }, { status: 400 });
  const sourceMode = MODES.find((m) => m === b.sourceMode) ?? "live";
  const claude = await draftPitchWithClaude(e);
  const text = claude.status === "ok" ? claude.data : draftPitch(e.work, e.show, e.sharedThemes, e.showTopics);
  const review = await reviewPitch({ claim: text, evidence: pitchEvidence(e), sourceMode });
  return Response.json({
    text,
    author: claude.status === "ok" ? { kind: "claude", model: claude.model } : { kind: "template", reason: claude.reason, configured: agentConfigured(), model: AGENT_MODEL },
    review,
  });
}
