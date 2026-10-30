import { test } from "node:test";
import assert from "node:assert/strict";
import { adaptAudience, adaptRun, tierOf } from "../lib/ui/adapt.ts";

test("tierOf maps popularity to reach tiers", () => {
  assert.equal(tierOf(0.1), "reachable");
  assert.equal(tierOf(0.5), "stretch");
  assert.equal(tierOf(0.9), "dream");
});

test("adaptRun keeps unresolved names and degraded causes", () => {
  assert.equal(adaptRun({ unresolved: ["x"], mode: "sample" }).state, "unresolved");
  assert.equal(adaptRun({ status: "degraded", mode: "live", error: "qloo_http_500" }).state, "degraded");
  assert.equal(adaptRun({ status: "empty", mode: "live", data: [] }).state, "empty");
});

test("adaptRun maps shows", () => {
  const r = adaptRun({ status: "ok", mode: "live", workId: "w", data: [{ id: "a", name: "A", affinity: 0.8, popularity: 0.2, tie: true }] });
  assert.deepEqual(r.shows[0], { id: "a", name: "A", overlap: 0.8, tier: "reachable", tie: true });
});

test("adaptAudience returns null when Qloo gave nothing", () => {
  assert.equal(adaptAudience({ data: { age: {}, gender: {} } }), null);
});
