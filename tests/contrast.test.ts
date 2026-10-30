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
  ["body", "#14201a", "#f4eee0", 4.5],
  ["muted on ivory", "#4b5a52", "#f4eee0", 4.5],
  ["muted on card", "#4b5a52", "#fffcf5", 4.5],
  ["on-dark on panel", "#f1ead9", "#10291f", 4.5],
  ["on-dark muted on panel", "#b8c5bb", "#10291f", 4.5],
  ["on-dark on nav", "#f1ead9", "#0f261e", 4.5],
  ["on-dark muted on nav", "#b8c5bb", "#0f261e", 4.5],
  ["on-dark on active nav", "#f1ead9", "#24463a", 4.5],
  ["on-dark muted on active nav chip", "#b8c5bb", "#24463a", 4.5],
  ["input edge on card", "#7c8a82", "#fffcf5", 3],
  ["primary button", "#ffffff", "#1f6b4a", 4.5],
  ["live badge", "#14663f", "#e4f3ea", 4.5],
  ["recorded badge", "#2b4fa3", "#e8eefb", 4.5],
  ["sample badge", "#7a4f00", "#fff4d6", 4.5],
  ["alert badge", "#b42318", "#ffedeb", 4.5],
  ];

for (const [name, fg, bg, min] of pairs) {
  test(`contrast: ${name}`, () => assert.ok(ratio(fg, bg) >= min, `${name} ${ratio(fg, bg).toFixed(2)} < ${min}`));
}
