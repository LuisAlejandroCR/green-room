// agent.test.ts: provider order for the model calls: OpenRouter first, Anthropic only when OpenRouter is missing or fails.
// fetch is mocked; no network call is made and no real key is used.
import assert from "node:assert/strict";
import test from "node:test";
import { agentConfigured, agentProviders, baselineGuess, draftPitchWithClaude, OPENROUTER_MODEL } from "../lib/agent.ts";

type Handler = (url: string, init: RequestInit) => Response;
let handler: Handler = () => new Response("{}", { status: 500 });
const calls: { url: string; body: Record<string, unknown> }[] = [];
// Installed once, before the Anthropic client is created, so the SDK uses it too.
globalThis.fetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  calls.push({ url, body: init.body ? JSON.parse(String(init.body)) : {} });
  return handler(url, init);
}) as typeof fetch;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const openRouterOk = (text: string) => json({ model: OPENROUTER_MODEL, choices: [{ finish_reason: "stop", message: { content: text } }] });
const anthropicOk = (text: string) =>
  json({ id: "msg_1", type: "message", role: "assistant", model: "claude-sonnet-5-5", stop_reason: "end_turn", content: [{ type: "text", text }], usage: { input_tokens: 1, output_tokens: 1 } });

function env(vars: Record<string, string | undefined>) {
  for (const k of ["OP_API_KEY", "OP_BASE_URL", "ANTHROPIC_API_KEY"]) delete process.env[k];
  Object.assign(process.env, Object.fromEntries(Object.entries(vars).filter(([, v]) => v !== undefined)));
  calls.length = 0;
}
const EVIDENCE = { work: "W", show: "S", showTopics: [], sharedThemes: [], workTaste: [] };

test("with neither provider configured the call is a typed unavailable and nothing is fetched", async () => {
  env({});
  assert.equal(agentConfigured(), false);
  const r = await draftPitchWithClaude(EVIDENCE);
  assert.deepEqual(r, { status: "unavailable", reason: "missing OP_API_KEY and ANTHROPIC_API_KEY" });
  assert.equal(calls.length, 0);
});

test("OpenRouter is used first when both are configured", async () => {
  env({ OP_API_KEY: "test-op", OP_BASE_URL: "https://openrouter.example/api/v1/", ANTHROPIC_API_KEY: "test-an" });
  handler = (url) => (url.includes("openrouter.example") ? openRouterOk("Hi there\n\n[Your name]") : anthropicOk("wrong"));
  const r = await draftPitchWithClaude(EVIDENCE);
  assert.deepEqual(r, { status: "ok", data: "Hi there\n\n[Your name]", model: OPENROUTER_MODEL });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://openrouter.example/api/v1/chat/completions");
  assert.equal(calls[0].body.model, OPENROUTER_MODEL);
});

test("Anthropic answers when OpenRouter fails", async () => {
  env({ OP_API_KEY: "test-op", OP_BASE_URL: "https://openrouter.example/api/v1", ANTHROPIC_API_KEY: "test-an" });
  handler = (url) => (url.includes("openrouter.example") ? json({ error: "down" }, 503) : anthropicOk("One Show\nTwo Show"));
  const r = await baselineGuess("W", []);
  assert.deepEqual(r, { status: "ok", data: ["One Show", "Two Show"], model: "claude-sonnet-5-5" });
  assert.deepEqual(calls.map((c) => new URL(c.url).host), ["openrouter.example", "api.anthropic.com"]);
});

test("an OpenRouter failure is reported as is when Anthropic is not configured", async () => {
  env({ OP_API_KEY: "test-op", OP_BASE_URL: "https://openrouter.example/api/v1" });
  handler = () => json({ error: "bad key" }, 401);
  assert.deepEqual(await draftPitchWithClaude(EVIDENCE), { status: "failed", reason: "auth_failed" });
  assert.equal(calls.length, 1);
});

test("OpenRouter needs both the key and an https base URL", async () => {
  env({ OP_API_KEY: "test-op", OP_BASE_URL: "http://openrouter.example/api/v1" });
  assert.equal(agentConfigured(), false);
  env({ OP_BASE_URL: "https://openrouter.example/api/v1", ANTHROPIC_API_KEY: "test-an" });
  handler = () => anthropicOk("ok");
  await draftPitchWithClaude(EVIDENCE);
  assert.deepEqual(calls.map((c) => new URL(c.url).host), ["api.anthropic.com"]);
});

test("a pasted key with a trailing newline is trimmed before it reaches the header", async () => {
  env({ OP_API_KEY: "test-op\n", OP_BASE_URL: "https://openrouter.example/api/v1" });
  let auth = "";
  handler = (_url, init) => { auth = new Headers(init.headers).get("authorization") ?? ""; return openRouterOk("ok"); };
  assert.equal((await draftPitchWithClaude(EVIDENCE)).status, "ok");
  assert.equal(auth, "Bearer test-op");
});

test("health reports which providers are configured, as booleans only", () => {
  env({ OP_API_KEY: "test-op", ANTHROPIC_API_KEY: "test-an" });
  assert.deepEqual(agentProviders(), { openrouter: false, anthropic: true }); // no OP_BASE_URL
  env({ OP_API_KEY: "test-op", OP_BASE_URL: "https://openrouter.example/api/v1" });
  assert.deepEqual(agentProviders(), { openrouter: true, anthropic: false });
});
