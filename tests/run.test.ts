import { test } from "node:test";
import assert from "node:assert/strict";
import { executeRun } from "../lib/run.ts";
import { createBudget } from "../lib/qloo.ts";
import { entity, stubLive } from "./helpers.ts";

const podcasts = { results: { entities: [entity("p1", "Show 1", { popularity: 0.2, query: { affinity: 0.8 } })] } };

test("ambiguous name returns needs_confirmation and never calls recommendations", async () => {
  const calls = stubLive((u) =>
    u.pathname === "/search"
      ? { body: { results: u.searchParams.get("query") === "Dune" ? [entity("b1", "Dune (book)"), entity("m1", "Dune (film)")] : [entity("s1", "Tolkien")] } }
      : { body: podcasts },
  );
  const r = await executeRun({ work: "Dune", seeds: ["Tolkien"], confirmed: {} });
  assert.equal(r.state, "needs_confirmation");
  assert.equal(r.candidates[0].name, "Dune");
  assert.equal(r.candidates[0].options.length, 2);
  assert.equal(r.results.length, 0);
  assert.equal(calls.some((u) => u.pathname === "/v2/insights"), false);
});

test("confirmed ids are the only ids sent to recommendations", async () => {
  const calls = stubLive((u) => (u.pathname === "/search" ? { body: { results: [] } } : { body: podcasts }));
  const r = await executeRun({ work: "Dune", seeds: ["Tolkien"], confirmed: { Dune: "b1", Tolkien: "s1" } });
  assert.equal(r.state, "ok");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].searchParams.get("signal.interests.entities"), "b1,s1");
  assert.equal(r.results[0].provenance.popularity, 0.2);
  assert.equal(r.workId, "b1");
});

test("unknown names are reported, not guessed", async () => {
  stubLive(() => ({ body: { results: [] } }));
  const r = await executeRun({ work: "zzz", seeds: [], confirmed: {} });
  assert.equal(r.state, "unresolved");
  assert.deepEqual(r.unresolved, ["zzz"]);
});

test("retries exhausting the budget during resolution is a typed partial with exact notFetched", async () => {
  const calls = stubLive(() => ({ status: 500 }));
  const r = await executeRun({ work: "a", seeds: ["b"], confirmed: {} }, createBudget(1));
  assert.equal(r.state, "partial");
  assert.deepEqual(r.notFetched, ["search: a", "search: b", "recommendations"]);
  assert.equal(calls.length, 1);
  assert.equal(r.budget.used, 1);
});

test("two failed attempts on one search is degraded, not partial", async () => {
  stubLive(() => ({ status: 500 }));
  assert.equal((await executeRun({ work: "a", seeds: [], confirmed: {} }, createBudget(8))).state, "degraded");
});

test("budget exhaustion before recommendations is partial with exact notFetched", async () => {
  let n = 0;
  stubLive((u) => {
    if (u.pathname === "/search") return { body: { results: [entity(`id${n++}`, "x")] } };
    return { body: podcasts };
  });
  const r = await executeRun({ work: "a", seeds: ["b"], confirmed: {} }, createBudget(2));
  assert.equal(r.state, "partial");
  assert.deepEqual(r.notFetched, ["recommendations"]);
  assert.equal(r.budget.used, 2);
  assert.equal(r.results.length, 0);
});

test("a run never exceeds 8 Qloo requests even when everything fails", async () => {
  const calls = stubLive(() => ({ status: 500 }));
  await executeRun({ work: "a", seeds: ["b", "c", "d"], confirmed: {} });
  assert.ok(calls.length <= 8);
});
