// status.tsx: data-mode pill, the affinity and popularity notes, and notices. Data mode is always icon + text, never color alone.
// These are secondary to the results: small, flat, set in the interface sans.
import { AlertCircle, CheckCircle2, FlaskConical, History } from "lucide-react";
import type { Mode } from "@/lib/ui/types";
import { cn } from "@/lib/utils";

export const modeMeta: Record<Mode, { label: string; short: string; Icon: typeof CheckCircle2; text: string; soft: string }> = {
  live: { label: "LIVE · Qloo data", short: "LIVE · Qloo data", Icon: CheckCircle2, text: "text-live", soft: "bg-live-soft" },
  recorded: { label: "RECORDED · Real Qloo response", short: "RECORDED · Qloo data", Icon: History, text: "text-recorded", soft: "bg-recorded-soft" },
  sample: { label: "SAMPLE · Not Qloo data — live key pending", short: "SAMPLE · Not Qloo data", Icon: FlaskConical, text: "text-sample", soft: "bg-sample-soft" },
};

export function ModeBadge({ mode, short, className }: { mode: Mode; short?: boolean; className?: string }) {
  const m = modeMeta[mode];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-[3px] px-2 py-1 text-xs font-semibold leading-tight", m.soft, m.text, className)}>
      <m.Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {short ? m.short : m.label}
    </span>
  );
}

export const POPULARITY_NOTE = "Popularity is a Qloo index. It is not audience size, access, or booking likelihood.";
export const AFFINITY_NOTE = "Affinity is thematic alignment from Qloo. It is not audience size, access, or booking likelihood.";

export function Notice({ children, tone = "alert" }: { children: React.ReactNode; tone?: "alert" | "amber" }) {
  return (
    <p role="status" className={cn("flex items-start gap-2.5 border-l-4 p-4 text-sm font-semibold", tone === "alert" ? "border-alert bg-alert-soft text-alert" : "border-saffron bg-sample-soft text-sample")}>
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
