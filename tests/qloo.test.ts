import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPodcastQuery } from "../lib/qloo.ts";

test("podcast query caps take at 50 and only sends allowed params", () => {
  const q = buildPodcastQuery({ seedEntityIds: ["a", "b"], take: 500, popularityMax: 0.4 });
  assert.equal(q.get("take"), "50");
  assert.equal(q.get("filter.type"), "urn:entity:podcast");
  assert.equal(q.get("filter.popularity.max"), "0.4");
});

import { markTies } from "../lib/qloo.ts";

test("markTies flags neighbors within 0.05", () => {
  const out = markTies([
    { id: "a", name: "A", affinity: 0.8, popularity: 0.1 },
    { id: "b", name: "B", affinity: 0.78, popularity: 0.1 },
    { id: "c", name: "C", affinity: 0.5, popularity: 0.1 },
  ]);
  assert.deepEqual(out.map((p) => p.tie), [true, true, false]);
});
