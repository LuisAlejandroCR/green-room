// studio.tsx: Pitch Studio for the web desk. Claude drafts from Qloo evidence (or the labelled template when Claude
// is not configured), JEV answers three closed questions, and the code shows the decision and the rule behind it.
// Nothing is ever approved by default and nothing is sent: Copy is the only exit, and a blocked draft cannot be copied.
"use client";

import { useState } from "react";
import { Check, Copy, RefreshCw, ShieldAlert, ShieldCheck, ShieldQuestion, Sparkles } from "lucide-react";
import { PitchEditor } from "./pitch";
import type { GreenRoom, Review } from "./use-green-room";
import { Button } from "@/components/ui/button";
import type { UiShow } from "@/lib/ui/types";
import { cn } from "@/lib/utils";

const REASONS: Record<string, string> = {
  unsupported_claim: "May state a fact that is not in the Qloo evidence",
  booking_promise: "May imply a guaranteed interview or a booking likelihood",
  individual_inference: "May infer one person's taste from aggregate audience data",
  number_not_in_evidence: "Contains a number that is not in the evidence",
  contact_detail_in_draft: "Contains contact details",
  jev_not_configured: "JEV is not configured on this server",
  jev_timeout: "JEV did not answer within 5 seconds",
  jev_unreachable: "JEV could not be reached",
  jev_http_error: "JEV returned an error",
  jev_invalid_response: "JEV's answer could not be read",
};

const DECISION = {
  editorial_check_passed: { label: "Editorial check passed", note: "JEV found every risk at or below 0.20. You still review before sending.", Icon: ShieldCheck, tone: "bg-live-soft text-live" },
  human_review: { label: "Needs your review", note: "At least one answer is between 0.20 and 0.80, or JEV could not answer. Nothing was approved.", Icon: ShieldQuestion, tone: "bg-sample-soft text-sample" },
  revise: { label: "Revise suggested", note: "At least one risk is 0.80 or higher. Edit the draft, then check it again.", Icon: ShieldAlert, tone: "bg-alert-soft text-alert" },
  blocked: { label: "Blocked by a rule", note: "A deterministic check failed. Fix it before using this draft.", Icon: ShieldAlert, tone: "bg-alert-soft text-alert" },
} as const;

export function ReviewPanel({ review, stale }: { review: Review; stale?: boolean }) {
  const d = DECISION[review.decision];
  return (
    <section aria-label="JEV review" className={cn("rounded-[8px] p-4 text-sm", d.tone)}>
      <p className="flex items-center gap-2 font-semibold"><d.Icon className="size-4" aria-hidden="true" />JEV · {d.label}{stale && <span className="font-normal">(edited since this check)</span>}</p>
      <p className="mt-1">{d.note}</p>
      {review.reasons.length > 0 && (
        <ul className="mt-2 list-disc space-y-0.5 pl-5">
          {review.reasons.map((r, i) => (
            <li key={i}>{REASONS[r.rule] ?? r.rule}{r.value !== undefined && <span className="font-mono text-xs"> · {typeof r.value === "number" && r.value <= 1 ? `p=${r.value.toFixed(2)}` : String(r.value)}</span>}</li>
          ))}
        </ul>
      )}
      {Object.keys(review.answers).length > 0 && (
        <p className="mt-2 font-mono text-xs opacity-80">{Object.entries(review.answers).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(" · ")}{review.model && ` · ${review.model}`}</p>
      )}
    </section>
  );
}

export function PitchStudio({ g, show }: { g: GreenRoom; show: UiShow }) {
  const st = g.studio[show.id];
  const text = g.pitchFor(show);
  const [copied, setCopied] = useState(false);
  const blocked = st?.review?.decision === "blocked" && !st.stale;
  const author = st?.author;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => g.draft(show)} disabled={st?.status === "loading"}>
          <Sparkles aria-hidden="true" />{st?.status === "loading" ? "Drafting…" : st ? "Redraft from evidence" : "Draft from evidence"}
        </Button>
        <p className="text-sm text-muted-foreground" role="status">
          {!author ? "Not drafted yet: the text below is the evidence-only template."
            : author.kind === "claude" ? `Drafted by Claude (${author.model}) from Qloo evidence only.`
            : `Template draft · Claude is ${author.configured ? `unavailable (${author.reason})` : "not configured on this server"}.`}
        </p>
      </div>
      {st?.status === "error" && <p role="alert" className="text-sm font-semibold text-alert">The draft request failed. The template below is unchanged.</p>}
      <PitchEditor value={text} onChange={(t) => g.setPitch(show.id, t)} to={show.name} re={g.brief?.work ?? g.work} seed={show.id} />
      {st?.review && <ReviewPanel review={st.review} stale={st.stale} />}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => g.recheck(show)} disabled={st?.reviewing}>
          <RefreshCw aria-hidden="true" className={cn(st?.reviewing && "animate-spin")} />{st?.review ? "Check again with JEV" : "Check with JEV"}
        </Button>
        <Button disabled={blocked} onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* blocked clipboard */ } }}>
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{copied ? "Copied" : "Copy pitch"}
        </Button>
      </div>
    </div>
  );
}
