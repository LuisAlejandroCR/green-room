// vibes.ts: per-show colour, derived from the id. Decoration only: it never encodes a score, a rank or a threshold.

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
  return h;
}

// Fills carry white text, soft tints carry ink; pairs are asserted in tests/contrast.test.ts.
export const VIBES = [
  { fill: "#b8432c", soft: "#fde3d8", glow: "#f08a5d" }, // coral
  { fill: "#17666b", soft: "#d6f0ee", glow: "#5cc1b8" }, // teal
  { fill: "#6b3a7a", soft: "#efe0f4", glow: "#c08ad6" }, // plum
  { fill: "#2c5aa0", soft: "#dde8fa", glow: "#7fa8ec" }, // sky
  { fill: "#17402f", soft: "#dfe8dc", glow: "#8fae9a" }, // forest
  { fill: "#8a4a00", soft: "#fff0cc", glow: "#e8b04a" }, // saffron
] as const;

export type Vibe = (typeof VIBES)[number];
export const vibeOf = (seed: string): Vibe => VIBES[hash(seed) % VIBES.length];
