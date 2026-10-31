// desk.test.ts: crossfilter, facets, sorting with absent values, and the filter's URL state.
import { test } from "node:test";
import assert from "node:assert/strict";
import { filterShows, searchWithTopics, sortShows, topicCounts, topicsFromSearch } from "../lib/ui/desk.ts";
import type { UiShow } from "../lib/ui/types.ts";

const s = (id: string, overlap?: number, popularity?: number, topics?: string[]): UiShow => ({
  id, name: id, mode: "live", overlap, popularity, topics,
  provenance: { entityId: id, queryId: "q", source: "GET /v2/insights", retrievedAt: "2026-10-30T00:00:00Z" },
});
const rows = [s("b", 0.5, 0.9, ["Health", "Habits"]), s("a", 0.9, undefined, ["Habits"]), s("c", undefined, 0.1, ["Health"])];

test("topics filter with AND; no topics returns everything", () => {
  assert.deepEqual(filterShows(rows, ["Habits"]).map((r) => r.id), ["b", "a"]);
  assert.deepEqual(filterShows(rows, ["Habits", "Health"]).map((r) => r.id), ["b"]);
  assert.equal(filterShows(rows, []).length, 3);
});

test("facets count topics in the current rows", () => {
  assert.deepEqual(topicCounts(rows), [{ topic: "Habits", count: 2 }, { topic: "Health", count: 2 }]);
  assert.deepEqual(topicCounts(filterShows(rows, ["Health"])), [{ topic: "Health", count: 2 }, { topic: "Habits", count: 1 }]);
});

test("absent values sort last in both directions", () => {
  assert.deepEqual(sortShows(rows, "affinity", "desc").map((r) => r.id), ["a", "b", "c"]);
  assert.deepEqual(sortShows(rows, "affinity", "asc").map((r) => r.id), ["b", "a", "c"]);
  assert.deepEqual(sortShows(rows, "popularity", "asc").map((r) => r.id), ["c", "b", "a"]);
  assert.deepEqual(sortShows(rows, "name", "asc").map((r) => r.id), ["a", "b", "c"]);
});

test("filter round-trips through the URL and keeps other params", () => {
  const q = searchWithTopics("?x=1", ["Health", "Self Improvement"]);
  assert.equal(q, "?x=1&topic=Health&topic=Self+Improvement");
  assert.deepEqual(topicsFromSearch(q), ["Health", "Self Improvement"]);
  assert.equal(searchWithTopics("?topic=Health", []), "");
});
