import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPodcastQuery } from "../lib/qloo.ts";

test("podcast query caps take at 50 and only sends allowed params", () => {
  const q = buildPodcastQuery({ seedEntityIds: ["a", "b"], take: 500, popularityMax: 0.4 });
  assert.equal(q.get("take"), "50");
  assert.equal(q.get("filter.type"), "urn:entity:podcast");
  assert.equal(q.get("filter.popularity.max"), "0.4");
});
