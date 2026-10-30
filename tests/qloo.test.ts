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

test("description is kept only when Qloo returns a plain string", async () => {
  stubLive(() => ({
    body: { results: { entities: [entity("p1", "S1", { properties: { description: "A real description" } }), entity("p2", "S2", { properties: { description: { nested: true } } })] } },
  }));
  const [a, b] = (await recommendPodcasts({ seedEntityIds: ["w"] }, createBudget())).data!;
  assert.equal(a.description, "A real description");
  assert.equal("description" in b, false);
});

test("live-shape adaptation: results as array or keyed, four description paths, optional fields stay absent", async () => {
  stubLive(() => ({
    body: { results: [
      entity("a", "A", { short_description: "short" }),
      entity("b", "B", { description: "top" }),
      entity("c", "C", { properties: { short_description: "pshort" } }),
      entity("d", "D", { properties: { description: "pdesc" }, affinity: 0.6 }),
      entity("e", "E"),
    ] },
  }));
  const data = (await recommendPodcasts({ seedEntityIds: ["w"] }, createBudget())).data!;
  assert.deepEqual(data.map((p) => p.description), ["short", "top", "pshort", "pdesc", undefined]);
  assert.equal(data[3].provenance.affinity, 0.6);
  assert.equal("affinity" in data[4].provenance, false);
  assert.equal("popularity" in data[4].provenance, false);
});

test("search accepts results as an array or keyed by entities", async () => {
  stubLive(() => ({ body: { results: { entities: [entity("x", "X")] } } }));
  assert.equal((await searchEntity("x", "t", createBudget())).data![0].id, "x");
  stubLive(() => ({ body: { results: [entity("y", "Y")] } }));
  assert.equal((await searchEntity("y", "t", createBudget())).data![0].id, "y");
});

test("recommendations accept `id` as well as `entity_id`, and keep provenance entityId", async () => {
  stubLive(() => ({ body: { results: [{ id: "p1", name: "Pod One" }] } }));
  const env = await recommendPodcasts({ seedEntityIds: ["w"] }, createBudget());
  assert.equal(env.status, "ok");
  assert.equal(env.data![0].id, "p1");
  assert.equal(env.data![0].provenance.entityId, "p1");
});

test("a 400 on signal.interests.entities is the typed seed_not_usable, other 4xx stay qloo_http_N", async () => {
  const errors = [{ message: "All of the provided signal.interests.entities were invalid.", path: "signal.interests.entities" }];
  stubLive(() => ({ status: 400, body: { errors } }));
  const env = await recommendPodcasts({ seedEntityIds: ["w"] }, createBudget());
  assert.equal(env.status, "degraded");
  assert.equal(env.error, "seed_not_usable");
  assert.equal(env.data, null);
  stubLive(() => ({ status: 400, body: { errors: [{ message: "take", path: "take" }] } }));
  assert.equal((await recommendPodcasts({ seedEntityIds: ["w"] }, createBudget())).error, "qloo_http_400");
  stubLive(() => ({ status: 400, rawText: "not json" }));
  assert.equal((await recommendPodcasts({ seedEntityIds: ["w"] }, createBudget())).error, "qloo_http_400");
});

test("seeds Qloo reports as unusable in warnings are surfaced, not silently dropped", async () => {
  stubLive(() => ({
    body: {
      results: { entities: [entity("p1", "Pod")] },
      warnings: [{ type: "not_found", "signal.interests.entities": ["bad", "not-sent"] }],
    },
  }));
  const env = await recommendPodcasts({ seedEntityIds: ["good", "bad"] }, createBudget());
  assert.equal(env.status, "ok");
  assert.deepEqual(env.ignoredSeedIds, ["bad"]);
  stubLive(() => ({ body: { results: { entities: [entity("p1", "Pod")] } } }));
  assert.deepEqual((await recommendPodcasts({ seedEntityIds: ["good"] }, createBudget())).ignoredSeedIds, []);
});

test("optional enrichments: empty and partial payloads are typed, never thrown", async () => {
  stubLive(() => ({ body: { results: { demographics: [] } } }));
  const d = await audienceOf("p", createBudget());
  assert.equal(d.status, "empty");
  stubLive(() => ({ body: { results: { tags: [{ name: "t" }, { name: "ok", query: { affinity: 0.5 } }] } } }));
  const { sharedAngles } = await import("../lib/qloo.ts");
  const a = await sharedAngles("w", "p", createBudget());
  assert.deepEqual(a.data, [{ tag: "ok", score: 0.5 }]);
});
