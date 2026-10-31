// cover.tsx: real Qloo cover art with generated art as the fallback, plus the per-show colour "vibe".
// The vibe is decoration derived from the id; it never encodes a score or a ranking.
"use client";

import { useState } from "react";
import { Art } from "./art";
import { cn } from "@/lib/utils";
export { vibeOf, VIBES, type Vibe } from "@/lib/ui/vibes";

export function Cover({ src, seed, alt, className, rounded = "rounded-2xl" }: {
  src?: string; seed: string; alt: string; className?: string; rounded?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={cn("relative block shrink-0 overflow-hidden bg-paper-deep", rounded, className)}>
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote Qloo art, any host; no optimisation proxy
        <img src={src} alt={alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="size-full object-cover" />
      ) : (
        <Art seed={seed} />
      )}
    </span>
  );
}

/** Animated 0-1 ring. `big` shows the figure on a 0-100 scale for the mobile screens; desktop keeps Qloo's 0-1. */
export function FitRing({ value, size = 56, stroke = "currentColor", track = "rgb(0 0 0 / 0.12)", hundred, className }: {
  value: number | undefined; size?: number; stroke?: string; track?: string; hundred?: boolean; className?: string;
}) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const frac = value === undefined ? 0 : Math.max(0, Math.min(1, value));
  const label = value === undefined ? "Fit not available" : hundred ? `Fit ${Math.round(frac * 100)} out of 100` : `Affinity ${value.toFixed(2)} on a 0 to 1 scale`;
  const figure = value === undefined ? "–" : hundred ? String(Math.round(frac * 100)) : value.toFixed(2);
  return (
    <span role="img" aria-label={label} className={cn("relative inline-grid shrink-0 place-items-center", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 48 48" className="absolute inset-0 size-full -rotate-90" aria-hidden="true" focusable="false">
        <circle cx="24" cy="24" r={r} fill="none" stroke={track} strokeWidth="4" />
        {value !== undefined && (
          <circle cx="24" cy="24" r={r} fill="none" stroke={stroke} strokeWidth="4.4" strokeLinecap="round" strokeDasharray={`${circ * frac} ${circ}`} className="ring-draw" />
        )}
      </svg>
      <span aria-hidden="true" className={cn("font-display font-semibold leading-none tabular-nums", size >= 88 ? "text-3xl" : size >= 56 ? "text-lg" : "text-sm")}>{figure}</span>
    </span>
  );
}
