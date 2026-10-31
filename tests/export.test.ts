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

test("CSV keeps provenance per row, adds fit, cover and brief, and leaves absent values empty", () => {
  const csv = toCsv(
    [show("a", { overlap: 0.91, popularity: 0.4, topics: ["Habits", "Focus"], channel: "Net, Inc", image: "https://img.example/a.jpg", description: "Talks." }), show("b", { image: "http://insecure/b.jpg" })],
    (id) => id === "a",
    { work: "Dune", seeds: ["Nike", "LEGO"] },
  );
  assert.ok(csv.startsWith("﻿"), "UTF-8 BOM for spreadsheets");
  const [head, a, b] = csv.slice(1).trim().split("\r\n");
  assert.equal(head, "rank,podcast,channel,fit_0_100,affinity,popularity_index,popularity_note,topics,description,episodes,cover_url,data_mode,entity_id,query_id,source,retrieved_at,saved,work,fans_also_love");
  assert.equal(a, `1,Show a,"Net, Inc",91,0.91,0.4,"${POPULARITY_NOTE}",Habits; Focus,Talks.,,https://img.example/a.jpg,live,a,q_abc,GET /v2/insights,2026-10-30T10:00:00.000Z,yes,Dune,Nike; LEGO`);
  assert.equal(b, "2,Show b,,,,,,,,,,live,b,q_abc,GET /v2/insights,2026-10-30T10:00:00.000Z,no,Dune,Nike; LEGO", "absent stays empty; non-https cover dropped");
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

test("HTML report shows Qloo covers (https only), fit bars, recurring topics and stats", () => {
  const html = toHtmlReport(
    [show("a", { overlap: 0.93, image: "https://img.example/a.jpg", topics: ["Science", "Culture"] }), show("b", { overlap: 0.81, image: "javascript:alert(1)", topics: ["Science"] }), show("c")],
    { work: "Dune", seeds: [], mode: "live", workCover: "https://img.example/dune.jpg" },
    "2026-10-30T12:00:00.000Z",
  );
  assert.ok(html.includes('src="https://img.example/a.jpg"'));
  assert.ok(html.includes('src="https://img.example/dune.jpg"'));
  assert.equal(html.includes("javascript:"), false);
  assert.ok(html.includes("width:93%") && html.includes("Fit 93"));
  assert.ok(html.includes("Fit n/a"), "absent affinity stays absent");
  assert.ok(html.includes("<b>93</b>best fit") && html.includes("<b>87</b>average fit"));
  assert.ok(html.indexOf(">Science<") < html.indexOf(">Culture<"), "most frequent topic first");
});
