// export.ts: the web desk deliverable. Shortlist as CSV and as a standalone, illustrated HTML report (Qloo cover art,
// per-show colour, fit bars, topic chips), each row with its Qloo provenance. Pure: no DOM, no dates other than the one
// passed in, so it is testable and deterministic. Colour is decoration only (lib/ui/vibes.ts), never a score.
import { formatRetrieved } from "./format.ts";
import type { Mode, UiShow } from "./types.ts";
import { vibeOf } from "./vibes.ts";

export const AFFINITY_NOTE = "Affinity is thematic alignment from Qloo. It is not audience size, access, or booking likelihood.";
export const POPULARITY_NOTE = "Popularity is a Qloo index. It is not audience size, access, or booking likelihood.";

export interface ExportBrief {
  work: string;
  seeds: string[];
  mode: Mode | null;
  recordedAt?: string;
  workCover?: string; // the picked candidate's Qloo cover, when there is one
}

const CSV_HEADER = [
  "rank", "podcast", "channel", "fit_0_100", "affinity", "popularity_index", "popularity_note", "topics", "description",
  "episodes", "cover_url", "data_mode", "entity_id", "query_id", "source", "retrieved_at", "saved", "work", "fans_also_love",
];

/** RFC 4180 quoting, plus a leading apostrophe on cells a spreadsheet would run as a formula. */
export function csvCell(v: string | number | undefined): string {
  if (v === undefined) return "";
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s) && typeof v === "string") s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Only https images are linked (Qloo serves https; anything else is dropped rather than embedded). */
const httpsUrl = (u?: string) => (u && /^https:\/\//.test(u) ? u : undefined);
const fit100 = (s: UiShow) => (s.overlap !== undefined ? Math.round(Math.min(1, Math.max(0, s.overlap)) * 100) : undefined);

/** UTF-8 with a byte-order mark so spreadsheets keep accents and emoji in show names. */
export function toCsv(shows: UiShow[], isSaved: (id: string) => boolean, brief?: Pick<ExportBrief, "work" | "seeds">): string {
  const rows = shows.map((s, i) => [
    i + 1, s.name, s.channel, fit100(s), s.overlap, s.popularity, s.popularity !== undefined ? POPULARITY_NOTE : undefined,
    s.topics?.join("; "), s.description, s.episodes, httpsUrl(s.image), s.mode,
    s.provenance.entityId, s.provenance.queryId, s.provenance.source, s.provenance.retrievedAt, isSaved(s.id) ? "yes" : "no",
    brief?.work, brief?.seeds.join("; ") || undefined,
  ].map(csvCell).join(","));
  return "﻿" + [CSV_HEADER.join(","), ...rows].join("\r\n") + "\r\n";
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const MODE_LABEL: Record<Mode, string> = {
  live: "LIVE · Qloo data",
  recorded: "RECORDED · Real Qloo response",
  sample: "SAMPLE · Not Qloo data",
};

/** Topics that recur across the list, most frequent first. */
function topTopics(shows: UiShow[], n = 6): string[] {
  const counts = new Map<string, number>();
  for (const s of shows) for (const t of s.topics ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n).map(([t]) => t);
}

function card(s: UiShow, i: number): string {
  const v = vibeOf(s.id);
  const fit = fit100(s);
  const img = httpsUrl(s.image);
  const chips = (s.topics ?? []).slice(0, 4).map((t) => `<span class="chip" style="background:${vibeOf(t).soft}">${esc(t)}</span>`).join("");
  return `<article class="card" style="--fill:${v.fill};--soft:${v.soft};--glow:${v.glow}">
<div class="art">${img ? `<img src="${esc(img)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<span class="letter">${esc(s.name.slice(0, 1))}</span>`}<span class="rank">#${i + 1}</span></div>
<div class="body">
<h2>${esc(s.name)}</h2>${s.channel ? `<p class="muted">${esc(s.channel)}</p>` : ""}
<div class="fit"><span class="bar"><span style="width:${fit ?? 0}%"></span></span><strong>${fit !== undefined ? `Fit ${fit}` : "Fit n/a"}</strong></div>
${chips ? `<p class="chips">${chips}</p>` : ""}
${s.description ? `<p class="desc">${esc(s.description)}</p>` : ""}
<p class="prov">${s.popularity !== undefined ? `Qloo popularity index ${s.popularity.toFixed(2)} · ` : ""}${esc(s.provenance.source)} · query ${esc(s.provenance.queryId)} · entity ${esc(s.provenance.entityId)} · ${esc(formatRetrieved(s.provenance.retrievedAt))}</p>
</div>
</article>`;
}

export function toHtmlReport(shows: UiShow[], brief: ExportBrief, generatedAt: string): string {
  const mode = brief.mode ? MODE_LABEL[brief.mode] + (brief.mode === "recorded" && brief.recordedAt ? `, captured ${formatRetrieved(brief.recordedAt)}` : "") : "Unknown data mode";
  const fits = shows.map(fit100).filter((f): f is number => f !== undefined);
  const cover = httpsUrl(brief.workCover);
  const topics = topTopics(shows);
  const hero = vibeOf(brief.work);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Green Room shortlist: ${esc(brief.work)}</title>
<style>
*{box-sizing:border-box}body{font:15px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;margin:0;color:#13261d;background:#f8f4ea}
.wrap{max-width:72rem;margin:0 auto;padding:0 1rem 3rem}
header{background:linear-gradient(120deg,#17402f 0%,${hero.fill} 60%,#b8432c 100%);color:#fff;padding:2.5rem 0;margin-bottom:2rem}
header .wrap{display:flex;gap:1.5rem;align-items:center;padding-bottom:0}
header img{width:7rem;height:9rem;object-fit:cover;border-radius:.6rem;box-shadow:0 10px 30px rgba(0,0,0,.35)}
h1{font:600 2.2rem/1.15 Georgia,"Times New Roman",serif;margin:.2rem 0 .6rem}.eyebrow{text-transform:uppercase;letter-spacing:.16em;font-size:.75rem;opacity:.85}
.pill{display:inline-block;padding:.2rem .6rem;border-radius:999px;background:rgba(255,255,255,.18);font-weight:600;font-size:.85rem;margin:.15rem .3rem .15rem 0}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(12rem,1fr));gap:.8rem;margin-bottom:1.5rem}
.stat{background:#fff;border-radius:.8rem;padding:1rem;border:1px solid #e3dccb}.stat b{display:block;font:600 1.8rem Georgia,serif;color:#17402f}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(20rem,1fr));gap:1rem}
.card{display:flex;gap:1rem;background:#fff;border-radius:1rem;padding:.9rem;border:1px solid #e3dccb;border-top:6px solid var(--fill)}
.art{position:relative;flex:0 0 7rem}.art img,.letter{width:7rem;height:7rem;border-radius:.6rem;object-fit:cover;display:grid;place-items:center;background:var(--soft);font:700 2.5rem Georgia,serif;color:var(--fill)}
.rank{position:absolute;left:.35rem;top:.35rem;background:var(--fill);color:#fff;font-weight:700;font-size:.8rem;padding:.1rem .45rem;border-radius:999px}
.body{min-width:0}h2{font:600 1.15rem/1.25 Georgia,serif;margin:0}.muted{color:#4b5b52;margin:.1rem 0 0;font-size:.85rem}
.fit{display:flex;align-items:center;gap:.6rem;margin:.55rem 0}.bar{flex:1;height:.55rem;background:#efe8d8;border-radius:999px;overflow:hidden}.bar span{display:block;height:100%;background:linear-gradient(90deg,var(--glow),var(--fill))}
.chips{margin:.3rem 0}.chip{display:inline-block;padding:.1rem .5rem;border-radius:999px;font-size:.75rem;font-weight:600;margin:0 .25rem .25rem 0;color:#13261d}
.desc{font-size:.88rem;margin:.3rem 0;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.prov{font-size:.72rem;color:#5d6b63;margin:.4rem 0 0;word-break:break-word}
footer{margin-top:2rem;font-size:.8rem;color:#4b5b52}
@media print{header{-webkit-print-color-adjust:exact;print-color-adjust:exact}.card{break-inside:avoid}}
</style></head>
<body>
<header><div class="wrap">
${cover ? `<img src="${esc(cover)}" alt="" referrerpolicy="no-referrer">` : ""}
<div><p class="eyebrow">Green Room · podcast shortlist</p>
<h1>Podcasts for ${esc(brief.work)}</h1>
<p>${brief.seeds.map((s) => `<span class="pill">Fans also love: ${esc(s)}</span>`).join("")}<span class="pill">${esc(mode)}</span></p></div>
</div></header>
<main class="wrap">
<section class="stats">
<div class="stat"><b>${shows.length}</b>podcasts from Qloo</div>
<div class="stat"><b>${fits.length ? Math.max(...fits) : "n/a"}</b>best fit (out of 100)</div>
<div class="stat"><b>${fits.length ? Math.round(fits.reduce((a, b) => a + b, 0) / fits.length) : "n/a"}</b>average fit</div>
${topics.length ? `<div class="stat" style="grid-column:span 2"><span class="muted">Topics that recur</span><p class="chips">${topics.map((t) => `<span class="chip" style="background:${vibeOf(t).soft}">${esc(t)}</span>`).join("")}</p></div>` : ""}
</section>
<section class="grid">
${shows.map(card).join("\n")}
</section>
<footer>
<p>Generated ${esc(formatRetrieved(generatedAt))} by Green Room. Green Room drafts pitches; it never sends email.</p>
<p>${AFFINITY_NOTE} Fit is that affinity on a 0-100 scale.<br>${POPULARITY_NOTE}<br>Cover art and descriptions come from Qloo; images load from Qloo's servers when the report is opened.</p>
</footer>
</main>
</body></html>
`;
}
