import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPodcastQuery, createBudget, recommendPodcasts, searchEntity, audienceOf } from "../lib/qloo.ts";
import { entity, stubLive } from "./helpers.ts";

test("podcast query caps take at 50, sends no popularity filter and only allowed params", () => {
  const q = buildPodcastQuery({ seedEntityIds: ["a", "b"], take: 500 });
  assert.equal(q.get("take"), "50");
  assert.equal(q.get("filter.type"), "urn:entity:podcast");
  assert.equal(q.has("filter.popularity.max"), false);
  assert.deepEqual([...q.keys()].sort(), ["feature.explainability", "filter.type", "signal.interests.entities", "take"]);
});

test("every result carries provenance; absent popularity and affinity stay absent", async () => {
  stubLive(() => ({
    body: { results: { entities: [entity("p1", "Show 1", { popularity: 0.4, query: { affinity: 0.9 } }), entity("p2", "Show 2")] } },
  }));
  const env = await recommendPodcasts({ seedEntityIds: ["w"] }, createBudget());
  assert.equal(env.status, "ok");
  const [a, b] = env.data!;
  assert.equal(a.provenance.popularity, 0.4);
  assert.equal(a.provenance.affinity, 0.9);
  assert.equal(a.mode, "live");
  for (const r of env.data!) {
    assert.equal(r.provenance.entityId, r.id);
    assert.match(r.provenance.queryId, /^q_[0-9a-f]{12}$/);
    assert.ok(r.provenance.retrievedAt && r.provenance.source);
  }
  assert.equal("popularity" in b.provenance, false);
  assert.equal("affinity" in b.provenance, false);
});

test("budget: retries spend budget and a run cannot exceed its max", async () => {
  const calls = stubLive(() => ({ status: 500 }));
  const budget = createBudget(8);
  const results = [];
  for (let i = 0; i < 6; i++) results.push(await searchEntity(`n${i}`, "t", budget));
  assert.equal(calls.length, 8);
  assert.equal(budget.used, 8);
  assert.equal(results[3].status, "degraded"); // 4th search used attempts 7-8
  assert.equal(results[4].status, "budget_exhausted");
  assert.equal(results[4].data, null);
});

test("no silent fallback: live failures never return sample data", async () => {
  stubLive(() => ({ throws: true }));
  const env = await recommendPodcasts({ seedEntityIds: ["w"] }, createBudget());
  assert.equal(env.status, "degraded");
  assert.equal(env.mode, "live");
  assert.equal(env.data, null);
});

test("no silent fallback: live mode without a key is degraded, not sample", async () => {
  stubLive(() => ({ body: {} }));
  delete process.env.QLOO_API_KEY;
  const env = await recommendPodcasts({ seedEntityIds: ["w"] }, createBudget());
  assert.equal(env.status, "degraded");
  assert.equal(env.error, "missing_api_key");
  assert.equal(env.mode, "live");
  assert.equal(env.data, null);
});

test("malformed bodies are typed, not guessed", async () => {
  stubLive(() => ({ rawText: "not json" }));
  assert.equal((await recommendPodcasts({ seedEntityIds: ["w"] }, createBudget())).status, "malformed");
  stubLive(() => ({ body: { results: { entities: [{ nope: true }] } } }));
  assert.equal((await recommendPodcasts({ seedEntityIds: ["w"] }, createBudget())).status, "malformed");
});

test("sample mode is configuration-only, labeled, and spends no budget", async () => {
  process.env.QLOO_MODE = "sample";
  const budget = createBudget();
  const env = await recommendPodcasts({ seedEntityIds: ["w"] }, budget);
  assert.equal(env.mode, "sample");
  assert.equal(budget.used, 0);
  assert.match(env.data![0].provenance.source, /synthetic fixture/);
  assert.equal(env.data![2].provenance.popularity, undefined);
});

test("audience failure is a typed envelope", async () => {
  stubLive(() => ({ status: 403 }));
  assert.equal((await audienceOf("p1", createBudget())).status, "degraded");
});
