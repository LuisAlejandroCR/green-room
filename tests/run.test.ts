import { test } from "node:test";
import assert from "node:assert/strict";
import { executeRun } from "../lib/run.ts";
import { createBudget } from "../lib/qloo.ts";
import { entity, stubLive } from "./helpers.ts";

const verified = (...ids: string[]) => ({ results: ids.map((id) => entity(id, `Entity ${id}`)) });
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
  const calls = stubLive((u) => (u.pathname === "/search" ? { body: { results: [] } } : u.pathname === "/entities" ? { body: verified("b1", "s1") } : { body: podcasts }));
  const r = await executeRun({ work: "Dune", seeds: ["Tolkien"], confirmed: { Dune: "b1", Tolkien: "s1" } });
  assert.equal(r.state, "ok");
  assert.equal(calls.filter((c) => c.pathname === "/search").length, 0);
  assert.equal(calls[0].pathname, "/entities");
  assert.equal(calls[0].searchParams.get("entity_ids"), "b1,s1");
  assert.equal(calls[1].searchParams.get("signal.interests.entities"), "b1,s1");
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

test("seed_not_usable from Qloo is a typed degraded run with no results", async () => {
  stubLive(() => ({ status: 400, body: { errors: [{ message: "invalid", path: "signal.interests.entities" }] } }));
  const r = await executeRun({ work: "Dune", seeds: [], confirmed: { Dune: "b1" } });
  assert.equal(r.state, "degraded");
  assert.equal(r.error, "seed_not_usable");
  assert.equal(r.results.length, 0);
});

test("dropped seeds are named in ignoredSeeds; an ignored work gets no workId for compare", async () => {
  const body = (bad: string) => ({ body: { results: { entities: [entity("p1", "Show 1")] }, warnings: [{ type: "not_found", "signal.interests.entities": [bad] }] } });
  const answer = (bad: string) => (u: URL) => (u.pathname === "/entities" ? { body: verified("b1", "s1") } : body(bad));
  stubLive(answer("s1"));
  const a = await executeRun({ work: "Dune", seeds: ["Tolkien"], confirmed: { Dune: "b1", Tolkien: "s1" } });
  assert.deepEqual(a.ignoredSeeds, ["Tolkien"]);
  assert.equal(a.workId, "b1");
  stubLive(answer("b1"));
  const b = await executeRun({ work: "Dune", seeds: ["Tolkien"], confirmed: { Dune: "b1", Tolkien: "s1" } });
  assert.deepEqual(b.ignoredSeeds, ["Dune"]);
  assert.equal(b.workId, null);
  assert.equal(b.state, "ok");
});

test("a confirmed id Qloo does not return on /entities is never used", async () => {
  const calls = stubLive((u) => (u.pathname === "/entities" ? { body: verified("b1") } : { body: podcasts }));
  const r = await executeRun({ work: "Dune", seeds: ["Tolkien"], confirmed: { Dune: "b1", Tolkien: "forged" } });
  assert.equal(r.state, "unresolved");
  assert.deepEqual(r.unresolved, ["Tolkien"]);
  assert.equal(r.error, "confirmed_id_not_verified");
  assert.equal(calls.some((c) => c.pathname === "/v2/insights"), false);
});

test("verification failure is degraded and nothing is recommended", async () => {
  const calls = stubLive((u) => (u.pathname === "/entities" ? { status: 500 } : { body: podcasts }));
  const r = await executeRun({ work: "Dune", seeds: [], confirmed: { Dune: "b1" } });
  assert.equal(r.state, "degraded");
  assert.equal(calls.some((c) => c.pathname === "/v2/insights"), false);
});

test("tag signal is sent and the work's taste analysis is attached; taste failure changes nothing", async () => {
  const taste = { results: { tags: [{ tag_id: "urn:tag:keyword:qloo:habits", name: "Habits", query: { affinity: 0.9 } }, { tag_id: "urn:tag:x", name: "Podcasts", query: { affinity: 0.5 } }] } };
  const calls = stubLive((u) =>
    u.pathname === "/entities" ? { body: verified("b1") }
      : u.searchParams.get("filter.type") === "urn:tag" ? { body: taste } : { body: podcasts });
  const r = await executeRun({ work: "Dune", seeds: [], confirmed: { Dune: "b1" }, tags: ["urn:tag:keyword:qloo:focus", "bad tag!"] });
  assert.equal(r.state, "ok");
  const rec = calls.find((c) => c.searchParams.get("filter.type") === "urn:entity:podcast")!;
  assert.equal(rec.searchParams.get("signal.interests.tags"), "urn:tag:keyword:qloo:focus");
  assert.deepEqual(r.taste, [{ id: "urn:tag:keyword:qloo:habits", name: "Habits", score: 0.9 }]);
  assert.deepEqual(r.seedIds, ["b1"]);
  stubLive((u) => (u.pathname === "/entities" ? { body: verified("b1") } : u.searchParams.get("filter.type") === "urn:tag" ? { status: 500 } : { body: podcasts }));
  const r2 = await executeRun({ work: "Dune", seeds: [], confirmed: { Dune: "b1" } });
  assert.equal(r2.state, "ok");
  assert.deepEqual(r2.taste, []);
});
