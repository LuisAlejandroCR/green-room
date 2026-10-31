// export.test.ts: the CSV and HTML deliverables keep per-row provenance and never invent values.
import { test } from "node:test";
import assert from "node:assert/strict";
import { csvCell, POPULARITY_NOTE, toCsv, toHtmlReport } from "../lib/ui/export.ts";
import type { UiShow } from "../lib/ui/types.ts";

const show = (id: string, extra: Partial<UiShow> = {}): UiShow => ({
  id, name: `Show ${id}`, mode: "live",
  provenance: { entityId: id, queryId: "q_abc", source: "GET /v2/insights", retrievedAt: "2026-10-30T10:00:00.000Z" },
  ...extra,
});

test("CSV keeps provenance per row and leaves absent values empty", () => {
  const csv = toCsv([show("a", { overlap: 0.91, popularity: 0.4, topics: ["Habits", "Focus"], channel: "Net, Inc" }), show("b")], (id) => id === "a");
  const [head, a, b] = csv.trim().split("\r\n");
  assert.ok(head.startsWith("rank,podcast,channel,topics,affinity,popularity_index,popularity_note,data_mode,entity_id,query_id,source,retrieved_at,saved"));
  assert.equal(a, `1,Show a,"Net, Inc",Habits; Focus,0.91,0.4,"${POPULARITY_NOTE}",live,a,q_abc,GET /v2/insights,2026-10-30T10:00:00.000Z,yes`);
  assert.equal(b, "2,Show b,,,,,,live,b,q_abc,GET /v2/insights,2026-10-30T10:00:00.000Z,no");
});

test("CSV quotes and defuses spreadsheet formulas", () => {
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell("=HYPERLINK(1)"), "'=HYPERLINK(1)");
  assert.equal(csvCell(-0.5), "-0.5");
  assert.equal(csvCell(undefined), "");
});

test("HTML report escapes Qloo text, shows the data mode and the notes", () => {
  const html = toHtmlReport([show("x", { name: "<script>alert(1)</script>", overlap: 0.5 })], { work: "Dune & Co", seeds: ["Nike"], mode: "recorded", recordedAt: "2026-10-29T08:00:00.000Z" }, "2026-10-30T12:00:00.000Z");
  assert.equal(html.includes("<script>alert"), false);
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("Dune &amp; Co"));
  assert.ok(html.includes("RECORDED · Real Qloo response, captured 29 Oct 2026, 08:00 UTC"));
  assert.ok(html.includes("query q_abc"));
  assert.ok(html.includes("never sends email"));
});
