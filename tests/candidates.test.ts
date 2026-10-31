// candidates.test.ts: Qloo's top match leads, Claude's suggestion is a second signal, and the confirm hint says what is missing.
import assert from "node:assert/strict";
import test from "node:test";
import { candidateBadge, pickHint, pickProgress, workTitle } from "../lib/ui/candidates.ts";

test("Qloo's top match is the first candidate; Claude only labels the option it named", () => {
  assert.equal(candidateBadge(0, "a", null), "qloo");
  assert.equal(candidateBadge(0, "a", "a"), "both");
  assert.equal(candidateBadge(1, "b", "b"), "claude");
  assert.equal(candidateBadge(1, "b", "a"), null);
  assert.equal(candidateBadge(2, "c", undefined), null);
});

test("pick progress counts chosen names and lists the missing ones in order", () => {
  const groups = [{ name: "Atomic Habits" }, { name: "Nike Training Club" }];
  assert.deepEqual(pickProgress(groups, { "Atomic Habits": "x" }), { picked: 1, total: 2, missing: ["Nike Training Club"] });
  assert.deepEqual(pickProgress(groups, {}), { picked: 0, total: 2, missing: ["Atomic Habits", "Nike Training Club"] });
});

test("the confirm hint explains what is missing and disappears when every name has a pick", () => {
  const groups = [{ name: "Atomic Habits" }, { name: "Nike Training Club" }];
  assert.equal(pickHint(groups, { "Atomic Habits": "x" }), "Pick one match per name to continue: 1 of 2 chosen, still to pick: “Nike Training Club”.");
  assert.equal(pickHint([{ name: "Dune" }], {}), "Pick one match for “Dune” to continue.");
  assert.equal(pickHint(groups, { "Atomic Habits": "x", "Nike Training Club": "y" }), null);
});

test("the pitch names the title the person picked, main title only, else what they typed", () => {
  assert.equal(workTitle("Atomic Habits", { name: "Atomic Habits Journal: A Daily Motivational Journal" }), "Atomic Habits Journal");
  assert.equal(workTitle("Atomic Habits", { name: "Atomic Habits" }), "Atomic Habits");
  assert.equal(workTitle(" Dune ", undefined), "Dune");
  assert.equal(workTitle("Dune", { name: "  " }), "Dune");
});
