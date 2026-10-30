// status.tsx: badges with icon and text, never color alone: data mode, plus notices.
import { AlertCircle, CheckCircle2, FlaskConical, History } from "lucide-react";
import type { Mode } from "@/lib/ui/types";
import { cn } from "@/lib/utils";

export const modeMeta: Record<Mode, { label: string; Icon: typeof CheckCircle2; text: string; soft: string }> = {
  live: { label: "LIVE · Qloo data", Icon: CheckCircle2, text: "text-live", soft: "bg-live-soft" },
  recorded: { label: "RECORDED · Real Qloo response", Icon: History, text: "text-recorded", soft: "bg-recorded-soft" },
  sample: { label: "SAMPLE · Not Qloo data — live key pending", Icon: FlaskConical, text: "text-sample", soft: "bg-sample-soft" },
};

export function ModeBadge({ mode, className }: { mode: Mode; className?: string }) {
  const m = modeMeta[mode];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold", m.soft, m.text, className)}>
      <m.Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {m.label}
    </span>
  );
}

export const POPULARITY_NOTE = "Popularity is a Qloo index. It is not audience size, access, or booking likelihood.";

export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="flex items-start gap-2 rounded-2xl bg-alert-soft p-4 text-sm font-semibold text-alert">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
