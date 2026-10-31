// android-logic.test.ts: the Expo app's pure helpers stay in step with the web app (demo brief, pitch, show facts).
import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_BRIEF } from "../lib/demo.ts";
import { draftPitch } from "../lib/pitch.ts";
import * as m from "../android-app/src/logic.ts";

test("native demo brief is the same human-picked brief as the web demo", () => {
  assert.deepEqual(m.DEMO_BRIEF, DEMO_BRIEF);
});

test("native pitch draft matches the web draft word for word", () => {
  assert.equal(m.draftPitch("Atomic Habits", "Show A", ["focus"], ["self-help"]), draftPitch("Atomic Habits", "Show A", ["focus"], ["self-help"]));
  assert.equal(m.draftPitch("W", "S", [], []), draftPitch("W", "S", [], []));
});

test("api base accepts only a real https origin", () => {
  assert.equal(m.apiBase("https://green-room.vercel.app/"), "https://green-room.vercel.app");
  assert.equal(m.apiBase(undefined), null);
  assert.equal(m.apiBase("http://green-room.vercel.app"), null);
  assert.equal(m.apiBase("https://SET-YOUR-VERCEL-URL.vercel.app"), null);
  assert.equal(m.apiBase("https://x.vercel.app/api"), null);
});

test("seeds are trimmed and capped at 3 like the server", () => {
  assert.deepEqual(m.parseSeeds(" a, ,b,c,d "), ["a", "b", "c"]);
});

test("fit is 0-100 from affinity and stays absent when Qloo gave none", () => {
  const base = { id: "1", name: "S", mode: "live" as const };
  assert.equal(m.fitOf({ ...base, provenance: { affinity: 0.826 } }), 83);
  assert.equal(m.fitOf({ ...base, provenance: {} }), undefined);
});

test("only ok or partial runs with results open the deck", () => {
  const run = { state: "ok", mode: "live", workId: "w", results: [], candidates: [], unresolved: [] } as m.Run;
  assert.equal(m.hasDeck(run), false);
  assert.equal(m.hasDeck({ ...run, results: [{ id: "1", name: "S", mode: "live", provenance: {} }] }), true);
  assert.equal(m.hasDeck(null), false);
});

test("show facts keep ok envelopes and drop failed ones", () => {
  const d = m.parseDetail({
    angles: { status: "ok", data: [{ tag: "a" }, { tag: "b" }, { tag: "c" }, { tag: "d" }] },
    audience: { status: "ok", data: { age: { "25_to_29": 0.4, "35_and_younger": 0.2, "50_to_54": 0 } } },
  });
  assert.deepEqual(d, { angles: ["a", "b", "c"], ages: ["25–29", "35 & younger"] });
  assert.deepEqual(m.parseDetail({ angles: { status: "failed", data: null } }), { angles: [], ages: [] });
});

test("native pick hint uses the same words as the web", async () => {
  const { pickHint } = await import("../lib/ui/candidates.ts");
  const groups = [{ name: "A" }, { name: "B" }];
  for (const c of [{}, { A: "x" }, { A: "x", B: "y" }]) assert.equal(m.pickHint(groups, c), pickHint(groups, c));
  assert.equal(m.pickHint([{ name: "Dune" }], {}), pickHint([{ name: "Dune" }], {}));
});
