// art.tsx: abstract cut-paper plates built from plain SVG. Decorative only (aria-hidden): no data, no people.
// Art = deterministic thumbnail per podcast (arch, sun, sprig, pines, landscape, leaf); Collage = the campaign plate;
// Botanical = the quiet line-art that fills the sidebar; LeafMark = the geometric leaf in the wordmark.
import { cn } from "@/lib/utils";

const PALETTES = [
  { paper: "#f1e1c8", sun: "#d4533b", far: "#8fae9a", mid: "#4d7d52", near: "#173e30", leaf: "#c9663f", gold: "#e8b04a" },
  { paper: "#ebe3cd", sun: "#e8b04a", far: "#a4bba5", mid: "#2f6b57", near: "#0f2a20", leaf: "#c4663f", gold: "#d4533b" },
  { paper: "#dfe8dc", sun: "#d4533b", far: "#7fa58c", mid: "#285a49", near: "#12332a", leaf: "#e0a15a", gold: "#e8b04a" },
  { paper: "#e9c9a6", sun: "#f1e1c8", far: "#b4623f", mid: "#6f8a4f", near: "#173e30", leaf: "#2f6b57", gold: "#e8b04a" },
];

function hash(seed: string): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0;
  // Finalizer: ids that differ in one character (sample-1, sample-2) must still pick different plates.
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

export type ArtVariant = "landscape" | "leaf" | "arch" | "sun" | "sprig" | "pines";
const VARIANTS: ArtVariant[] = ["arch", "sun", "sprig", "pines", "landscape", "leaf"];

export function Art({ seed, variant, className }: { seed: string; variant?: ArtVariant; className?: string }) {
  const h = hash(seed);
  const c = PALETTES[h % PALETTES.length];
  const v: ArtVariant = variant ?? VARIANTS[(h >>> 3) % VARIANTS.length];
  const s = (h >>> 5) % 14;
  return (
    <svg viewBox="0 0 120 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" className={cn("block size-full", className)}>
      {v === "landscape" && (
        <>
          <rect width="120" height="90" fill={c.paper} />
          <circle cx={78 - s} cy="30" r="13" fill={c.sun} />
          <path d={`M0 62 C20 ${40 + s / 3} 40 50 62 44 S100 36 120 50 V90 H0Z`} fill={c.far} />
          <path d={`M0 72 C25 56 45 ${64 - s / 3} 70 58 S105 56 120 66 V90 H0Z`} fill={c.mid} />
          <path d="M0 82 C30 72 60 84 120 74 V90 H0Z" fill={c.near} />
        </>
      )}
      {v === "leaf" && (
        <>
          <rect width="120" height="90" fill={c.near} />
          <path d={`M60 90 C20 ${70 - s} 22 22 60 ${6 + s / 2} C98 22 100 ${70 - s} 60 90Z`} fill={c.mid} />
          <path d="M60 88 C60 60 60 40 60 14" stroke={c.far} strokeWidth="1.6" fill="none" />
          <path d={`M60 60 C80 54 96 ${44 + s / 2} 108 30 C94 30 70 40 60 60Z`} fill={c.leaf} />
          <path d={`M60 66 C42 62 26 ${54 - s / 3} 12 42 C26 40 50 48 60 66Z`} fill={c.far} />
        </>
      )}
      {v === "arch" && (
        <>
          <rect width="120" height="90" fill={c.paper} />
          <path d="M26 90 V40 A34 34 0 0 1 94 40 V90Z" fill={c.leaf} />
          <path d="M40 90 V44 A20 20 0 0 1 80 44 V90Z" fill={c.near} />
          <circle cx={74 - s / 2} cy="34" r="7" fill={c.gold} />
          <path d={`M0 90 C14 ${74 - s / 2} 28 70 40 74 C30 78 18 84 0 90Z`} fill={c.mid} />
          <path d="M120 90 C106 70 96 66 84 70 C96 76 108 82 120 90Z" fill={c.far} />
        </>
      )}
      {v === "sun" && (
        <>
          <rect width="120" height="90" fill={c.paper} />
          <circle cx={46 + s} cy="36" r="17" fill={c.sun} />
          <path d={`M0 66 C22 ${48 + s / 3} 44 62 70 52 S108 46 120 58 V90 H0Z`} fill={c.far} />
          <path d="M0 78 C28 64 56 80 82 70 S112 68 120 74 V90 H0Z" fill={c.mid} />
          <path d="M18 90 C20 70 26 60 36 52 C38 66 34 80 30 90Z" fill={c.near} />
        </>
      )}
      {v === "sprig" && (
        <>
          <rect width="120" height="90" fill={c.far} />
          <path d="M60 94 C58 70 62 46 52 14" stroke={c.near} strokeWidth="2" fill="none" />
          <path d="M58 74 C40 72 28 60 26 44 C44 46 56 58 58 74Z" fill={c.near} />
          <path d="M60 58 C78 56 90 44 92 28 C74 30 62 42 60 58Z" fill={c.near} />
          <path d="M54 38 C42 36 34 28 34 16 C46 18 54 26 54 38Z" fill={c.near} />
          <circle cx="98" cy="70" r="8" fill={c.gold} opacity="0.9" />
        </>
      )}
      {v === "pines" && (
        <>
          <rect width="120" height="90" fill={c.near} />
          <circle cx="86" cy="26" r="11" fill={c.gold} opacity="0.9" />
          <path d="M0 62 C30 50 50 58 80 48 S110 52 120 50 V90 H0Z" fill={c.far} opacity="0.55" />
          {[14, 34, 54, 76, 98].map((x, i) => (
            <path key={x} d={`M${x} 90 L${x + 9} ${44 + ((i * 7 + s) % 12)} L${x + 18} 90Z`} fill={i % 2 ? c.mid : c.far} />
          ))}
        </>
      )}
    </svg>
  );
}

/** The campaign plate: layered cut paper (arch, sun, leaf, hills). Same piece on every screen so the campaign is recognisable. */
export function Collage({ className, wide }: { className?: string; wide?: boolean }) {
  if (wide) {
    return (
      <svg viewBox="0 0 360 130" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" className={cn("block size-full", className)}>
        <rect width="360" height="130" fill="#f1e1c8" />
        <circle cx="236" cy="48" r="26" fill="#e8b04a" />
        <path d="M40 130 V56 A44 44 0 0 1 128 56 V130Z" fill="#c9663f" />
        <path d="M60 130 V62 A24 24 0 0 1 108 62 V130Z" fill="#173e30" />
        <path d="M0 130 C40 96 90 92 150 104 S280 100 360 84 V130Z" fill="#4d7d52" />
        <path d="M150 130 C200 108 270 112 360 108 V130Z" fill="#8fae9a" />
        <path d="M300 130 C298 100 304 76 292 44" stroke="#173e30" strokeWidth="2" fill="none" />
        <path d="M298 96 C282 94 272 84 270 70 C286 72 296 82 298 96Z" fill="#173e30" />
        <path d="M300 78 C316 76 326 64 328 50 C312 52 302 62 300 78Z" fill="#c9663f" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 160 140" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" className={cn("block size-full", className)}>
      <rect width="160" height="140" fill="#f1e1c8" />
      <path d="M30 140 V62 A50 50 0 0 1 130 62 V140Z" fill="#c9663f" />
      <path d="M52 140 V70 A28 28 0 0 1 108 70 V140Z" fill="#173e30" />
      <circle cx="112" cy="40" r="13" fill="#e8b04a" />
      <path d="M0 140 C16 108 40 100 64 108 C44 116 24 126 0 140Z" fill="#4d7d52" />
      <path d="M160 140 C146 106 124 98 100 106 C124 112 142 124 160 140Z" fill="#8fae9a" />
      <path d="M80 140 C78 118 82 100 72 80" stroke="#8fae9a" strokeWidth="2" fill="none" />
      <path d="M79 118 C66 116 58 108 56 96 C68 98 78 106 79 118Z" fill="#8fae9a" />
      <path d="M80 104 C92 102 100 94 102 82 C90 84 82 92 80 104Z" fill="#f1e1c8" />
    </svg>
  );
}

/** Quiet line-art for the foot of the sidebar. */
export function Botanical({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false" className={cn("pointer-events-none block size-full", className)} fill="none">
      <path d="M40 300 C44 220 36 150 70 90" stroke="#2c4a3d" strokeWidth="1.5" />
      <path d="M44 250 C16 244 4 214 6 186 C32 192 46 218 44 250Z" fill="#17382b" />
      <path d="M52 200 C84 196 100 170 100 140 C70 144 52 170 52 200Z" fill="#17382b" />
      <path d="M62 140 C40 132 32 108 36 84 C58 92 66 114 62 140Z" fill="#17382b" />
      <path d="M150 300 C150 240 168 190 200 150" stroke="#2c4a3d" strokeWidth="1.5" />
      <path d="M152 262 C180 262 200 244 204 218 C176 216 154 234 152 262Z" fill="#17382b" />
      <path d="M166 214 C190 206 204 186 204 164 C180 168 166 188 166 214Z" fill="#17382b" />
      <path d="M150 288 C128 288 112 274 110 254 C132 254 148 268 150 288Z" fill="#17382b" />
      <circle cx="196" cy="80" r="26" fill="none" stroke="#2c4a3d" strokeWidth="1.2" />
    </svg>
  );
}

/** Geometric leaf for the wordmark. */
export function LeafMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
      <path d="M3 21C3 10 9 3 22 2c0 12-7 19-17 19" fill="currentColor" />
      <path d="M3 21c4-6 9-11 15-14" stroke="var(--leaf-vein, var(--paper))" strokeWidth="1.3" fill="none" opacity="0.75" />
    </svg>
  );
}
