import { test } from "node:test";
import assert from "node:assert/strict";
import { clientIp, createLimiter } from "../lib/rate-limit.ts";
import { limitRequest, makeLimiters } from "../lib/guard.ts";

test("limiter allows up to the limit then reports a retry time, per key", () => {
  let t = 1_000;
  const l = createLimiter({ limit: 2, windowMs: 60_000, now: () => t });
  assert.equal(l.check("a").ok, true);
  assert.equal(l.check("a").ok, true);
  const denied = l.check("a");
  assert.equal(denied.ok, false);
  assert.equal(denied.retryAfterSeconds, 60);
  assert.equal(l.check("b").ok, true); // other key unaffected
  t += 30_000;
  assert.equal(l.check("a").retryAfterSeconds, 30);
  t += 30_000;
  assert.equal(l.check("a").ok, true); // window reset
});

test("limiter is bounded and fails closed when the key table is full", () => {
  let t = 0;
  const l = createLimiter({ limit: 5, windowMs: 60_000, maxKeys: 3, now: () => t });
  for (const k of ["a", "b", "c"]) assert.equal(l.check(k).ok, true);
  assert.equal(l.check("d").ok, false); // new key denied, table not grown
  assert.equal(l.check("a").ok, true); // existing keys keep working
  t += 60_000;
  assert.equal(l.check("d").ok, true); // expired windows are pruned
});

test("clientIp trusts one proxy hop and falls back to a shared bucket", () => {
  assert.equal(clientIp(new Headers({ "x-real-ip": "1.1.1.1", "x-forwarded-for": "9.9.9.9, 2.2.2.2" })), "1.1.1.1");
  assert.equal(clientIp(new Headers({ "x-forwarded-for": "6.6.6.6, 3.3.3.3" })), "3.3.3.3"); // spoofed leading entry ignored
  assert.equal(clientIp(new Headers()), "unknown");
});

test("limitRequest returns a typed 429 with Retry-After and no body leakage", async () => {
  const set = makeLimiters({ run: { perIp: 1, global: 10 }, show: { perIp: 5, global: 10 } });
  const req = () => new Request("http://x/api/run", { headers: { "x-real-ip": "5.5.5.5" } });
  assert.equal(limitRequest(req(), "run", set), null);
  const res = limitRequest(req(), "run", set)!;
  assert.equal(res.status, 429);
  assert.equal(res.headers.get("Retry-After"), "60");
  assert.deepEqual(await res.json(), { state: "rate_limited", error: "rate_limited", retryAfterSeconds: 60 });
  assert.equal(limitRequest(new Request("http://x", { headers: { "x-real-ip": "6.6.6.6" } }), "run", set), null); // other IP ok
});

test("global cap protects Qloo across IPs, and buckets are independent", () => {
  const set = makeLimiters({ run: { perIp: 5, global: 2 }, show: { perIp: 5, global: 2 } });
  const from = (ip: string) => new Request("http://x", { headers: { "x-real-ip": ip } });
  assert.equal(limitRequest(from("1.1.1.1"), "run", set), null);
  assert.equal(limitRequest(from("2.2.2.2"), "run", set), null);
  assert.equal(limitRequest(from("3.3.3.3"), "run", set)!.status, 429);
  assert.equal(limitRequest(from("3.3.3.3"), "show", set), null);
});
