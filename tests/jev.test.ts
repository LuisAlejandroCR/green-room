// jev.test.ts: JEV review policy. Thresholds 0.20/0.80, invalid answers, timeout and deterministic checks.
// No network: fetch is injected.
import { test } from "node:test";
import assert from "node:assert/strict";
import { decide, deterministicChecks, JEV_MODEL, QUESTIONS, reviewPitch, RISK_HIGH, RISK_LOW } from "../lib/jev.ts";

const ans = (u: number, b: number, i: number) => ({
  unsupported_claim: { type: "noul", noul: u }, booking_promise: { type: "noul", noul: b }, individual_inference: { type: "noul", noul: i },
});
const input = { claim: "Hi, I'd love to share Dune with Show One's listeners.\n\n[Your name]", evidence: ["guest's work: Dune", "show: Show One"], sourceMode: "live" as const };

test("thresholds: max risk decides; exactly 0.20 passes, exactly 0.80 revises", () => {
  assert.equal(RISK_LOW, 0.2);
  assert.equal(RISK_HIGH, 0.8);
  assert.equal(decide(ans(0.2, 0.1, 0)).decision, "editorial_check_passed");
  assert.equal(decide(ans(0.21, 0.1, 0)).decision, "human_review");
  assert.equal(decide(ans(0.79, 0.1, 0)).decision, "human_review");
  const r = decide(ans(0.1, 0.8, 0.5));
  assert.equal(r.decision, "revise");
  assert.deepEqual(r.reasons, [{ rule: "booking_promise", value: 0.8 }]);
  assert.deepEqual(decide(ans(0.5, 0.1, 0.3)).reasons.map((x) => x.rule), ["unsupported_claim", "individual_inference"]);
});

test("invalid answers are human review, never approval", () => {
  for (const bad of [undefined, null, {}, { unsupported_claim: { noul: 0.1 } }, ans(Number.NaN, 0, 0), ans(1.2, 0, 0), ans(-0.1, 0, 0), { ...ans(0, 0, 0), booking_promise: { noul: "0.1" } }]) {
    const r = decide(bad);
    assert.equal(r.decision, "human_review");
    assert.equal(r.reasons[0].rule, "jev_invalid_response");
  }
});

test("deterministic checks win over JEV and JEV is not called", async () => {
  process.env.JEV_API_KEY = "test-jev-key";
  let called = false;
  const f = (async () => { called = true; return Response.json({ answers: ans(0, 0, 0) }); }) as typeof fetch;
  const r = await reviewPitch({ ...input, claim: "Our episode will reach 95% of your listeners. Write to me@example.com" }, f);
  assert.equal(r.decision, "blocked");
  assert.deepEqual(r.reasons.map((x) => x.rule).sort(), ["contact_detail_in_draft", "number_not_in_evidence"]);
  assert.equal(called, false);
  assert.deepEqual(deterministicChecks({ ...input, claim: "Dune 2 and Show One", evidence: ["guest's work: Dune 2"] }), []);
});

test("request shape follows the TypeSafe contract and the key stays in the header", async () => {
  process.env.JEV_API_KEY = "test-jev-key";
  let seen: { url: string; init: RequestInit } | null = null;
  const f = (async (url: unknown, init?: RequestInit) => {
    seen = { url: String(url), init: init! };
    return Response.json({ model: "jev-1.14.0", answers: ans(0.05, 0.02, 0.1), usage: { input_tokens: 300 } });
  }) as typeof fetch;
  const r = await reviewPitch(input, f);
  assert.equal(r.decision, "editorial_check_passed");
  assert.equal(r.model, "jev-1.14.0");
  assert.equal(seen!.url, "https://api.typesafe.ai/v1/systemone");
  assert.equal((seen!.init.headers as Record<string, string>).authorization, "Bearer test-jev-key");
  const body = JSON.parse(String(seen!.init.body));
  assert.equal(body.model, JEV_MODEL);
  assert.deepEqual(Object.keys(body.questions), Object.keys(QUESTIONS));
  assert.deepEqual(Object.keys(body.state).sort(), ["claim", "sourceMode", "suppliedEvidence"]);
  assert.equal(String(seen!.init.body).includes("test-jev-key"), false);
});

test("timeout, HTTP error, bad JSON and missing key are human review with a deterministic reason", async () => {
  process.env.JEV_API_KEY = "test-jev-key";
  const timeout = (async () => { const e = new Error("timed out"); e.name = "TimeoutError"; throw e; }) as typeof fetch;
  assert.deepEqual((await reviewPitch(input, timeout)).reasons, [{ rule: "jev_timeout" }]);
  const down = (async () => new Response("no", { status: 503 })) as typeof fetch;
  assert.deepEqual((await reviewPitch(input, down)).reasons, [{ rule: "jev_http_error", value: 503 }]);
  const junk = (async () => new Response("not json", { status: 200 })) as typeof fetch;
  assert.equal((await reviewPitch(input, junk)).reasons[0].rule, "jev_invalid_response");
  delete process.env.JEV_API_KEY;
  const r = await reviewPitch(input, (async () => { throw new Error("must not be called"); }) as typeof fetch);
  assert.equal(r.decision, "human_review");
  assert.deepEqual(r.reasons, [{ rule: "jev_not_configured" }]);
});
