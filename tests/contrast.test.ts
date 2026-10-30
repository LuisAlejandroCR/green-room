import { test } from "node:test";
import assert from "node:assert/strict";

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
  ["body", "#14201a", "#f6f4ee", 4.5],
  ["muted", "#4b5a52", "#f6f4ee", 4.5],
  ["primary button", "#ffffff", "#1f6b4a", 4.5],
  ["live badge", "#14663f", "#e4f3ea", 4.5],
  ["recorded badge", "#2b4fa3", "#e8eefb", 4.5],
  ["sample badge", "#7a4f00", "#fff4d6", 4.5],
  ["alert badge", "#b42318", "#ffedeb", 4.5],
  ["input edge", "#7c8a82", "#ffffff", 3],
];

for (const [name, fg, bg, min] of pairs) {
  test(`contrast: ${name}`, () => assert.ok(ratio(fg, bg) >= min, `${name} ${ratio(fg, bg).toFixed(2)} < ${min}`));
}
