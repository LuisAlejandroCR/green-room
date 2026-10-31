import assert from "node:assert/strict";
import test from "node:test";
import { executeDemo } from "../lib/demo.ts";

test("demo is deterministic, marked sample, and makes no Qloo request", () => {
  const input = { work: "A bright idea", seeds: ["Design"], confirmed: {} };
  const first = executeDemo(input);
  const second = executeDemo(input);
  assert.equal(first.state, "ok");
  assert.deepEqual(first, second);
  assert.equal(first.mode, "sample");
  assert.ok(first.results.every((result) => result.mode === "sample"));
  assert.ok(first.results.every((result) => result.provenance.source.includes("no Qloo request")));
  assert.equal(first.budget.used, 0);
});

test("demo preserves explicit ambiguity confirmation", () => {
  const run = executeDemo({ work: "ambiguous book", seeds: [], confirmed: {} });
  assert.equal(run.state, "needs_confirmation");
  assert.equal(run.results.length, 0);
  assert.equal(run.candidates.length, 1);
});
