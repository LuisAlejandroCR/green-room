// tour.test.ts: the RECORDED tour is relabelled, dated, and ignored when absent or invalid. The agent without a key
// is "unavailable", and pitch evidence carries the aggregate affinity statement.
import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeTour, readTour } from "../lib/tour.ts";
import { agentConfigured, baselineGuess, draftPitchWithClaude, suggestCandidate } from "../lib/agent.ts";
import { pitchEvidence } from "../lib/pitch.ts";
import type { RunResponse } from "../lib/run.ts";

const run: RunResponse = {
  state: "ok", mode: "live", workId: "w1", results: [{ id: "p1", name: "Show", mode: "live", provenance: { entityId: "p1", queryId: "q_1", source: "GET /v2/insights", retrievedAt: "2026-10-30T10:00:00.000Z", affinity: 0.9 } }],
  resolved: [], candidates: [], unresolved: [], notFetched: [], ignoredSeeds: [], influence: [], seedIds: ["w1"], taste: [], tags: [], budget: { used: 3, max: 8 },
};

test("a stored tour is served as RECORDED with its date on every result", () => {
  const t = readTour(encodeTour(run, "2026-10-30T12:00:00.000Z"))!;
  assert.equal(t.run.mode, "recorded");
  assert.equal(t.run.results[0].mode, "recorded");
  assert.equal(t.run.results[0].provenance.source, "RECORDED 2026-10-30 · GET /v2/insights");
  assert.equal(t.run.results[0].provenance.affinity, 0.9);
  assert.equal(readTour(encodeTour(t.run as unknown as RunResponse, "2026-10-31T00:00:00.000Z"))!.run.results[0].provenance.source, "RECORDED 2026-10-31 · GET /v2/insights");
});

test("absent, corrupt or non-ok recordings are absent, never repaired", () => {
  assert.equal(readTour(undefined), null);
  assert.equal(readTour("not base64 json"), null);
  assert.equal(readTour(encodeTour({ ...run, state: "degraded", results: [] })), null);
});

test("without OP_API_KEY or ANTHROPIC_API_KEY every agent call is typed unavailable and makes no request", async () => {
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.OP_API_KEY;
  assert.equal(agentConfigured(), false);
  const opts = [{ id: "a", name: "A" }, { id: "b", name: "B" }];
  for (const r of [await suggestCandidate({ name: "x", context: [], options: opts }), await draftPitchWithClaude({ work: "w", show: "s", showTopics: [], sharedThemes: [], workTaste: [] }), await baselineGuess("w", [])]) {
    assert.deepEqual(r, { status: "unavailable", reason: "missing OP_API_KEY and ANTHROPIC_API_KEY" });
  }
});

test("pitch evidence states aggregate affinity and lists only supplied tags", () => {
  const ev = pitchEvidence({ work: "Dune", show: "Show", showTopics: ["Sci-fi"], sharedThemes: [], workTaste: ["Space"] });
  assert.ok(ev.some((l) => l.includes("in aggregate, fans of Dune show taste affinity for Show")));
  assert.ok(ev.some((l) => l.endsWith("Sci-fi")));
  assert.equal(ev.some((l) => l.startsWith("themes")), false);
});
