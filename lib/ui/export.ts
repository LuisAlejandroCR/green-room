// export.ts: the web desk deliverable. Shortlist as CSV and as a standalone HTML report, each row with its Qloo
// provenance. Pure: no DOM, no dates other than the one passed in, so it is testable and deterministic.
import { formatRetrieved } from "./format.ts";
import type { Mode, UiShow } from "./types.ts";

export const AFFINITY_NOTE = "Affinity is thematic alignment from Qloo. It is not audience size, access, or booking likelihood.";
export const POPULARITY_NOTE = "Popularity is a Qloo index. It is not audience size, access, or booking likelihood.";

export interface ExportBrief {
  work: string;
  seeds: string[];
  mode: Mode | null;
  recordedAt?: string;
}

const CSV_HEADER = [
  "rank", "podcast", "channel", "topics", "affinity", "popularity_index", "popularity_note", "data_mode",
  "entity_id", "query_id", "source", "retrieved_at", "saved",
];

/** RFC 4180 quoting, plus a leading apostrophe on cells a spreadsheet would run as a formula. */
export function csvCell(v: string | number | undefined): string {
  if (v === undefined) return "";
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s) && typeof v === "string") s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(shows: UiShow[], isSaved: (id: string) => boolean): string {
  const rows = shows.map((s, i) => [
    i + 1, s.name, s.channel, s.topics?.join("; "), s.overlap, s.popularity, s.popularity !== undefined ? POPULARITY_NOTE : undefined,
    s.mode, s.provenance.entityId, s.provenance.queryId, s.provenance.source, s.provenance.retrievedAt, isSaved(s.id) ? "yes" : "no",
  ].map(csvCell).join(","));
  return [CSV_HEADER.join(","), ...rows].join("\r\n") + "\r\n";
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const MODE_LABEL: Record<Mode, string> = {
  live: "LIVE · Qloo data",
  recorded: "RECORDED · Real Qloo response",
  sample: "SAMPLE · Not Qloo data",
};

export function toHtmlReport(shows: UiShow[], brief: ExportBrief, generatedAt: string): string {
  const mode = brief.mode ? MODE_LABEL[brief.mode] + (brief.mode === "recorded" && brief.recordedAt ? `, captured ${formatRetrieved(brief.recordedAt)}` : "") : "Unknown data mode";
  const rows = shows.map((s, i) => `<tr>
<td>${i + 1}</td>
<td><strong>${esc(s.name)}</strong>${s.channel ? `<br><small>${esc(s.channel)}</small>` : ""}</td>
<td>${s.overlap !== undefined ? s.overlap.toFixed(2) : "n/a"}</td>
<td>${s.popularity !== undefined ? s.popularity.toFixed(2) : "n/a"}</td>
<td>${esc(s.topics?.join(", ") ?? "")}</td>
<td><small>${esc(s.provenance.source)}<br>query ${esc(s.provenance.queryId)}<br>entity ${esc(s.provenance.entityId)}<br>${esc(formatRetrieved(s.provenance.retrievedAt))}</small></td>
</tr>`).join("\n");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Green Room shortlist: ${esc(brief.work)}</title>
<style>body{font:15px/1.5 system-ui,sans-serif;margin:2rem auto;max-width:72rem;padding:0 1rem;color:#13261d;background:#f8f4ea}
table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #d8d0bd;padding:.5rem;text-align:left;vertical-align:top}
th{font-size:.8rem;text-transform:uppercase;letter-spacing:.06em}small{color:#4b5b52}.mode{display:inline-block;padding:.2rem .5rem;background:#e2efe6;font-weight:600}</style></head>
<body>
<h1>Podcast shortlist for ${esc(brief.work)}</h1>
<p>${brief.seeds.length ? `Fans also love: ${esc(brief.seeds.join(", "))}. ` : ""}<span class="mode">${esc(mode)}</span></p>
<p>Generated ${esc(formatRetrieved(generatedAt))} by Green Room. Green Room drafts pitches; it never sends email.</p>
<table><thead><tr><th>#</th><th>Podcast</th><th>Affinity (0-1)</th><th>Qloo popularity index</th><th>Topics</th><th>Provenance</th></tr></thead>
<tbody>
${rows}
</tbody></table>
<p><small>${AFFINITY_NOTE}<br>${POPULARITY_NOTE}</small></p>
</body></html>
`;
}
