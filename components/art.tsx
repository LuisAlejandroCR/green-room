// art.tsx: abstract botanical and landscape artwork, generated deterministically from a seed.
// Decorative only (aria-hidden): it carries no data and no people photography.
import { cn } from "@/lib/utils";

const PALETTES = [
  { sky: "#f3dcc4", sun: "#e2573d", far: "#7fa58c", mid: "#3f7a5a", near: "#173e30", leaf: "#d98b5f" },
  { sky: "#e9e3cf", sun: "#f2b84b", far: "#9bb7a3", mid: "#2f6b57", near: "#0f2f27", leaf: "#c4663f" },
  { sky: "#dfe8dc", sun: "#d1503f", far: "#6f9a86", mid: "#285a49", near: "#0c2820", leaf: "#e0a15a" },
];

function hash(seed: string): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0;
  return h;
}

export type ArtVariant = "landscape" | "leaf" | "tile";

export function Art({ seed, variant, className }: { seed: string; variant?: ArtVariant; className?: string }) {
  const h = hash(seed);
  const c = PALETTES[h % PALETTES.length];
  const v: ArtVariant = variant ?? (["landscape", "leaf", "tile"] as const)[(h >> 3) % 3];
  const shift = (h >> 5) % 18;
  return (
    <svg viewBox="0 0 120 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" className={cn("block size-full", className)}>
      {v === "landscape" && (
        <>
          <rect width="120" height="90" fill={c.sky} />
          <circle cx={78 - shift} cy="30" r="13" fill={c.sun} />
          <path d={`M0 62 C20 ${40 + shift / 3} 40 50 62 44 S100 36 120 50 V90 H0Z`} fill={c.far} />
          <path d={`M0 72 C25 56 45 ${64 - shift / 3} 70 58 S105 56 120 66 V90 H0Z`} fill={c.mid} />
          <path d="M0 82 C30 72 60 84 120 74 V90 H0Z" fill={c.near} />
        </>
      )}
      {v === "leaf" && (
        <>
          <rect width="120" height="90" fill={c.near} />
          <path d={`M60 90 C20 ${70 - shift} 22 22 60 ${6 + shift / 2} C98 22 100 ${70 - shift} 60 90Z`} fill={c.mid} />
          <path d="M60 88 C60 60 60 40 60 14" stroke={c.far} strokeWidth="1.6" fill="none" />
          <path d={`M60 60 C80 54 96 ${44 + shift / 2} 108 30 C94 30 70 40 60 60Z`} fill={c.leaf} />
          <path d={`M60 66 C42 62 26 ${54 - shift / 3} 12 42 C26 40 50 48 60 66Z`} fill={c.far} />
        </>
      )}
      {v === "tile" && (
        <>
          <rect width="120" height="90" fill={c.sky} />
          <path d={`M0 90 L${50 + shift} 0 L120 0 L120 90Z`} fill={c.mid} />
          <path d={`M0 90 L${28 + shift} 30 L${64 + shift} 90Z`} fill={c.near} />
          <circle cx="30" cy="26" r="11" fill={c.sun} />
          <path d="M70 90 C74 66 92 56 112 54 C108 74 92 88 70 90Z" fill={c.leaf} />
        </>
      )}
    </svg>
  );
}

/** Subtle cobalt route lines for the dark frame; decorative. */
export function RouteLines({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 200" aria-hidden="true" focusable="false" className={cn("pointer-events-none", className)} fill="none">
      <path d="M-10 150 C80 150 90 40 180 60 S300 170 410 40" stroke="var(--cobalt)" strokeWidth="1.5" opacity="0.55" />
      <path d="M-10 170 C70 170 110 80 190 90 S320 160 410 70" stroke="var(--cobalt)" strokeWidth="1" opacity="0.3" />
      <circle cx="180" cy="60" r="3.5" fill="var(--amber)" />
    </svg>
  );
}

/** Leaf mark for the Green Room wordmark. */
export function LeafMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
      <path d="M4 20C4 10 10 4 21 3c0 11-6 17-15 17" fill="currentColor" />
      <path d="M4 20c3-5 7-9 12-12" stroke="var(--forest)" strokeWidth="1.2" fill="none" opacity="0.6" />
    </svg>
  );
}
