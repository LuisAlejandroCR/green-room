// demo.test.ts: the demo brief is a pre-confirmed live brief: every name has a valid, human-picked ID.
import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_BRIEF } from "../lib/demo.ts";
import { validId } from "../lib/run.ts";

test("demo brief confirms every name it sends, so the app never picks an ID", () => {
  const names = [DEMO_BRIEF.work, ...DEMO_BRIEF.seeds];
  assert.ok(names.length <= 4);
  for (const name of names) assert.ok(validId(DEMO_BRIEF.confirmed[name]), name);
  assert.deepEqual(Object.keys(DEMO_BRIEF.confirmed).sort(), [...names].sort());
});
