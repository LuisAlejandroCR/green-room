// score-ring.tsx: affinity on Qloo's 0-1 scale as a ring. Absent value renders a dashed ring and "n/a".
import { formatScore } from "@/lib/ui/format";
import { cn } from "@/lib/utils";

export function ScoreRing({ value, size = 52, className }: { value: number | undefined; size?: number; className?: string }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const frac = value === undefined ? 0 : Math.max(0, Math.min(1, value));
  const label = value === undefined ? "Affinity unavailable" : `Affinity ${value.toFixed(2)} on a 0 to 1 scale`;
  return (
    <span role="img" aria-label={label} className={cn("relative inline-grid shrink-0 place-items-center", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 48 48" className="absolute inset-0 size-full -rotate-90" aria-hidden="true" focusable="false">
        <circle cx="24" cy="24" r={r} fill="none" stroke="var(--line)" strokeWidth="4" strokeDasharray={value === undefined ? "3 4" : undefined} />
        {value !== undefined && (
          <circle cx="24" cy="24" r={r} fill="none" stroke="var(--primary)" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${circ * frac} ${circ}`} />
        )}
      </svg>
      <span className={cn("font-bold tabular-nums", size >= 80 ? "text-2xl" : size < 48 ? "text-xs" : "text-sm")} aria-hidden="true">{formatScore(value)}</span>
    </span>
  );
}
