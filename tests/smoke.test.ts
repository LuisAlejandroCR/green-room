import { test } from "node:test";
import assert from "node:assert/strict";
import { fieldPaths, formatReport, rateLimitHeaders, redact, runSmoke } from "../lib/smoke.ts";

const KEY = "sk-test-SECRET-0123456789";
const SECRET_NAME = "A Very Secret Podcast Title";

function fakeQloo(opts: { ignorePopularity?: boolean; leakKeyInBody?: boolean } = {}) {
  const calls: string[] = [];
  const fetchImpl = (async (input: unknown, init?: RequestInit) => {
    const url = new URL(String(input));
    calls.push(`${url.pathname}?${[...url.searchParams.keys()].join(",")}`);
    assert.equal((init?.headers as Record<string, string>)["X-Api-Key"], KEY);
    const h = { "content-type": "application/json", "x-month-ratelimit-remaining": "9990", "x-second-ratelimit-reset": "soon" };
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: h });
    const p = url.pathname;
    if (p === "/search") {
      if (url.searchParams.get("query")?.startsWith("zzqx")) return json({ results: [] });
      return json({ results: [{ entity_id: "w1", name: SECRET_NAME }] });
    }
    if (p === "/entities") return json({ results: [{ entity_id: "w1", name: SECRET_NAME, types: ["urn:entity:book"] }] });
    if (p === "/v2/tags") return json({ results: { tags: [{ id: "urn:tag:keyword:qloo:habits", name: SECRET_NAME }] } });
    if (p === "/v2/trending") return json({ results: { trending: [] } });
    if (url.searchParams.get("filter.type") === "urn:tag") return json({ results: { tags: [{ tag_id: "urn:tag:x", name: SECRET_NAME, query: { affinity: 0.7 } }] } });
    if (url.searchParams.get("filter.type") === "urn:heatmap") return json({ results: { heatmap: [{ location: { latitude: 40.1, longitude: -74.2, geohash: "dr5" }, query: { affinity: 0.9 } }] } });
    if (p === "/v2/analysis/compare") return json({ results: { tags: [{ name: SECRET_NAME, query: { affinity: 0.4 } }] } });
    if (url.searchParams.get("filter.type") === "urn:demographics") return json({ results: { demographics: [{ query: { age: { "25_to_29": 0.4 }, gender: { female: 0.5 } } }] } });
    if (!url.searchParams.has("filter.type")) return json({ error: opts.leakKeyInBody ? `bad request for ${KEY}` : "missing filter.type" }, 400);
    const capped = url.searchParams.has("filter.popularity.max") && !opts.ignorePopularity;
    const entities = [
      { entity_id: "p1", name: SECRET_NAME, popularity: capped ? 0.3 : 0.9, query: { affinity: 0.8 }, properties: { description: "secret description" }, tags: [{ id: "urn:tag:genre:secret", name: SECRET_NAME }] },
      { entity_id: "p2", name: "Other", popularity: 0.2 },
    ].slice(0, capped ? 1 : 2);
    return json({ results: { entities } });
  }) as typeof fetch;
  return { fetchImpl, calls };
}

test("fieldPaths is structural: names and types, never values", () => {
  const paths = fieldPaths({ results: { entities: [{ name: SECRET_NAME, popularity: 0.4, query: { affinity: 0.9 } }] } });
  assert.deepEqual(paths, ["results.entities[].name:string", "results.entities[].popularity:number", "results.entities[].query.affinity:number"]);
  assert.equal(paths.join().includes(SECRET_NAME), false);
});

test("rateLimitHeaders keeps numeric values only", () => {
  const h = new Headers({ "x-month-ratelimit-remaining": "42", "x-second-ratelimit-reset": "tomorrow", "content-type": "application/json" });
  assert.deepEqual(rateLimitHeaders(h), { "x-month-ratelimit-remaining": "42", "x-second-ratelimit-reset": "<non-numeric>" });
});

test("redact removes every occurrence of a secret", () => {
  assert.equal(redact(`a ${KEY} b ${KEY}`, [KEY]), "a [redacted] b [redacted]");
});

test("report never contains the key or any response value, and covers all endpoints", async () => {
  const { fetchImpl, calls } = fakeQloo({ leakKeyInBody: true });
  const checks = await runSmoke({ key: KEY, baseUrl: "https://example.test", fetchImpl });
  const report = formatReport(checks, [KEY]);
  assert.equal(report.includes(KEY), false);
  assert.equal(report.includes(SECRET_NAME), false);
  assert.equal(report.includes("secret description"), false);
  for (const name of ["search (one type)", "podcast insights", "popularity filter", "compare", "demographics", "entities by id", "taste analysis", "shortlist ranked", "tag search", "heatmap", "trending", "malformed request", "empty search"]) {
    assert.ok(report.includes(name), name);
  }
  assert.match(report, /http: 200 {2}results: 2/);
  assert.match(report, /x-month-ratelimit-remaining=9990/);
  assert.match(report, /validation: pass/);
  assert.ok(calls.length >= 8);
});

test("popularity filter honored vs silently ignored is reported", async () => {
  const honored = await runSmoke({ key: KEY, baseUrl: "https://example.test", fetchImpl: fakeQloo().fetchImpl });
  assert.match(honored.find((c) => c.name.startsWith("popularity"))!.note!, /honored/);
  const ignored = await runSmoke({ key: KEY, baseUrl: "https://example.test", fetchImpl: fakeQloo({ ignorePopularity: true }).fetchImpl });
  assert.match(ignored.find((c) => c.name.startsWith("popularity"))!.note!, /IGNORED/);
});

test("a missing required field or an accepted malformed request fails validation; later checks skip without ids", async () => {
  const fetchImpl = (async (input: unknown) => {
    const url = new URL(String(input));
    if (url.pathname === "/search") return new Response(JSON.stringify({ results: [] }), { status: 200 });
    return new Response("{}", { status: 200 }); // malformed request accepted with 200
  }) as typeof fetch;
  const checks = await runSmoke({ key: KEY, baseUrl: "https://example.test", fetchImpl });
  assert.equal(checks.find((c) => c.name === "search (one type)")!.outcome, "fail"); // zero results for a real name
  assert.equal(checks.find((c) => c.name === "compare")!.outcome, "skipped");
  assert.equal(checks.find((c) => c.name === "malformed request")!.outcome, "fail");
  assert.match(formatReport(checks, [KEY]), /validation: FAIL/);
});

test("network failure is a typed failed check with no key in the output", async () => {
  const fetchImpl = (async () => { throw new Error(`boom ${KEY}`); }) as typeof fetch;
  const report = formatReport(await runSmoke({ key: KEY, baseUrl: "https://example.test", fetchImpl }), [KEY]);
  assert.equal(report.includes(KEY), false);
  assert.match(report, /no response/);
});
