import { test } from "node:test";
import assert from "node:assert/strict";
import { formatRetrieved, formatScore } from "../lib/ui/format.ts";
import { draftPitch } from "../lib/pitch.ts";

test("formatRetrieved is deterministic UTC and tolerates garbage", () => {
  assert.equal(formatRetrieved("2026-10-30T06:58:34.655Z"), "30 Oct 2026, 06:58 UTC");
  assert.equal(formatRetrieved("not a date"), "not a date");
});

test("absent score renders n/a, never 0", () => {
  assert.equal(formatScore(undefined), "n/a");
  assert.equal(formatScore(0.5), "0.50");
});

test("pitch uses only supplied themes and never offers to send", () => {
  const withThemes = draftPitch("Book", "Show", ["a", "b", "c", "d"]);
  assert.match(withThemes, /a, b, c\./);
  assert.doesNotMatch(withThemes, /\bd\b\./);
  assert.doesNotMatch(draftPitch("Book", "Show", []), /themes:/);
});
