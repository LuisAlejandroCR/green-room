import { test } from "node:test";
import assert from "node:assert/strict";
import { adaptAngles, adaptAudience, adaptRun } from "../lib/ui/adapt.ts";

const prov = { entityId: "a", queryId: "q_1", source: "GET /v2/insights", retrievedAt: "2026-10-30T00:00:00.000Z" };
const result = (extra = {}) => ({ id: "a", name: "A", mode: "live", provenance: { ...prov, ...extra } });

test("adaptRun preserves provenance and keeps absent popularity absent", () => {
  const r = adaptRun({ state: "ok", mode: "live", workId: "w", results: [result({ affinity: 0.8 }), result({ popularity: 0.3 })] });
  assert.equal(r.state, "ok");
  assert.equal(r.shows[0].provenance.queryId, "q_1");
  assert.equal(r.shows[0].popularity, undefined);
  assert.equal(r.shows[0].overlap, 0.8);
  assert.equal(r.shows[1].popularity, 0.3);
  assert.equal(r.shows[1].overlap, undefined);
});

test("a result without provenance makes the response malformed and shows nothing", () => {
  const r = adaptRun({ state: "ok", mode: "live", results: [{ id: "a", name: "A", mode: "live" }] });
  assert.equal(r.state, "malformed");
  assert.equal(r.shows.length, 0);
});

test("adaptRun keeps typed states explicit", () => {
  assert.equal(adaptRun({ state: "degraded", mode: "live", error: "qloo_http_500" }).state, "degraded");
  assert.equal(adaptRun({ state: "empty", mode: "live" }).state, "empty");
  assert.equal(adaptRun({ state: "unresolved", mode: "live", unresolved: ["x"] }).unresolved[0], "x");
  assert.equal(adaptRun({ error: "network" }).state, "failed");
  assert.equal(adaptRun("garbage").state, "malformed");
  assert.equal(adaptRun({ state: "weird" }).state, "malformed");
});

test("needs_confirmation carries candidates; a group with fewer than two options is malformed", () => {
  const ok = adaptRun({ state: "needs_confirmation", mode: "sample", candidates: [{ name: "Dune", options: [{ id: "1", name: "A" }, { id: "2", name: "B" }] }] });
  assert.equal(ok.state, "needs_confirmation");
  assert.equal(ok.candidates[0].options.length, 2);
  assert.equal(adaptRun({ state: "needs_confirmation", mode: "sample", candidates: [{ name: "x", options: [{ id: "1", name: "A" }] }] }).state, "malformed");
});

test("partial keeps notFetched and budget", () => {
  const r = adaptRun({ state: "partial", mode: "live", notFetched: ["recommendations"], budget: { used: 8, max: 8 } });
  assert.deepEqual(r.notFetched, ["recommendations"]);
  assert.deepEqual(r.budget, { used: 8, max: 8 });
});

test("enrichment failure is typed unavailable, never throws", () => {
  assert.deepEqual(adaptAudience({ status: "degraded", error: "qloo_http_500" }), { state: "unavailable", reason: "qloo_http_500" });
  assert.deepEqual(adaptAngles(undefined), { state: "unavailable", reason: "malformed" });
  assert.equal(adaptAudience({ status: "ok", data: { age: {}, gender: {} } }).state, "empty");
});

test("description and missing values: present passes through, absent stays absent", () => {
  const r = adaptRun({ state: "ok", mode: "live", results: [{ ...result(), description: "From Qloo" }, result()] });
  assert.equal(r.shows[0].description, "From Qloo");
  assert.equal(r.shows[1].description, undefined);
});

test("rate_limited is a typed state with retry guidance and no results", () => {
  const r = adaptRun({ state: "rate_limited", error: "rate_limited", retryAfterSeconds: 42 });
  assert.equal(r.state, "rate_limited");
  assert.equal(r.retryAfterSeconds, 42);
  assert.equal(r.shows.length, 0);
});

test("missing optional fields stay explicit through adaptation", () => {
  const r = adaptRun({ state: "ok", mode: "live", workId: "w", results: [result()] });
  const s = r.shows[0];
  assert.equal(s.description, undefined);
  assert.equal(s.popularity, undefined);
  assert.equal(s.overlap, undefined);
  assert.equal(adaptAudience({ status: "empty", data: null }).state, "empty");
  assert.equal(adaptAngles({ status: "ok", data: [] }).state, "empty");
});
