import { test } from "node:test";
import assert from "node:assert/strict";
import { VIBES } from "../lib/ui/vibes.ts";

const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// [text, background, minimum]; keep in sync with app/globals.css.
const pairs: [string, string, string, number][] = [
  ["ink on paper", "#14201a", "#f4efe3", 4.5],
  ["ink on card", "#14201a", "#fbf8ef", 4.5],
  ["muted on paper", "#4a584f", "#f4efe3", 4.5],
  ["muted on card", "#4a584f", "#fbf8ef", 4.5],
  ["muted on paper-deep", "#4a584f", "#ebe4d2", 4.5],
  ["coral-ink on paper (numerals, emphasis)", "#a93a25", "#f4efe3", 4.5],
  ["coral-ink on card", "#a93a25", "#fbf8ef", 4.5],
  ["ink on tag (sage-soft)", "#14201a", "#dfe8dc", 4.5],
  ["on-dark on forest", "#f1ead9", "#0f2a20", 4.5],
  ["on-dark muted on forest", "#b8c5bb", "#0f2a20", 4.5],
  ["on-dark on forest-2 (dark tags)", "#f1ead9", "#17382b", 4.5],
  ["on-dark muted on forest-2 (botanical, hover)", "#b8c5bb", "#17382b", 4.5],
  ["on-dark on active nav", "#f1ead9", "#2c4a3d", 4.5],
  ["forest on paper (panel button)", "#0f2a20", "#f4efe3", 4.5],
  ["sage icon on forest (non-text 3:1)", "#8fae9a", "#0f2a20", 3],
  ["input edge on card", "#6f7d74", "#fbf8ef", 3],
  ["primary button", "#f4efe3", "#17402f", 4.5],
  ["primary hover (forest)", "#f4efe3", "#0f2a20", 4.5],
  ["live badge", "#14663f", "#e4f3ea", 4.5],
  ["recorded badge", "#2b4fa3", "#e8eefb", 4.5],
  ["sample badge and review note", "#7a4f00", "#fff4d6", 4.5],
  ["alert notice", "#b42318", "#ffedeb", 4.5],
  ["coral-ink heart on card", "#a93a25", "#fbf8ef", 3],
];

// Per-show vibes (components/cover.tsx): white text on every fill, ink text on every soft tint.
for (const v of VIBES) {
  pairs.push([`white on vibe ${v.fill}`, "#ffffff", v.fill, 4.5], [`ink on vibe soft ${v.soft}`, "#14201a", v.soft, 4.5]);
}
// Gradient stops of the demo button carry white text.
for (const stop of ["#b8432c", "#8a4a00", "#6b3a7a"]) pairs.push([`white on demo gradient ${stop}`, "#ffffff", stop, 4.5]);

for (const [name, fg, bg, min] of pairs) {
  test(`contrast: ${name}`, () => assert.ok(ratio(fg, bg) >= min, `${name} ${ratio(fg, bg).toFixed(2)} < ${min}`));
}
