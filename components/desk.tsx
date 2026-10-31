// desk.tsx: the sections of the web campaign desk, each answering one question: where are my fans (table and topic
// crossfilter), how did Qloo shape this list (influence with and without each pick), how do two or three shows compare,
// where do their fans live (heatmap), and what would a model guess without Qloo (neutral baseline).
// Optional parts fail as a labelled state and never block the table or the pitch.
"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Bookmark, Download, FileText, MapPin, Scale, X } from "lucide-react";
import { Cover, vibeOf } from "./cover";
import { POPULARITY_NOTE } from "./status";
import type { GreenRoom } from "./use-green-room";
import { Button } from "@/components/ui/button";
import { adaptAngles, adaptAudience } from "@/lib/ui/adapt";
import { filterShows, sortShows, topicCounts, type SortDir, type SortKey } from "@/lib/ui/desk";
import { formatRetrieved } from "@/lib/ui/format";
import type { Enrichment, UiAngle, UiAudience, UiShow } from "@/lib/ui/types";
import { cn } from "@/lib/utils";

export function Section({ n, q, hint, children, id }: { n: number; q: string; hint?: string; children: React.ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="mt-12">
      <p className="eyebrow">Question {n}</p>
      <h2 id={id} className="mt-1 font-display text-3xl">{q}</h2>
      {hint && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{hint}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

// ---------- 1. Where are my fans?

export function FanTable({ g, topics, setTopics, compare, setCompare, onOpen, onExport }: {
  g: GreenRoom; topics: string[]; setTopics: (t: string[]) => void; compare: string[]; setCompare: (ids: string[]) => void;
  onOpen: (id: string) => void; onExport: (kind: "csv" | "html") => void;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "affinity", dir: "desc" });
  const rows = sortShows(filterShows(g.shows, topics), sort.key, sort.dir);
  const facets = topicCounts(filterShows(g.shows, topics)).slice(0, 14);
  const toggleTopic = (t: string) => setTopics(topics.includes(t) ? topics.filter((x) => x !== t) : [...topics, t]);
  const head = (key: SortKey, label: string, extra?: React.ReactNode) => {
    const on = sort.key === key;
    return (
      <th scope="col" aria-sort={on ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className="px-3 py-2 text-left">
        <button type="button" onClick={() => setSort({ key, dir: on && sort.dir === "desc" ? "asc" : "desc" })} className="inline-flex items-center gap-1 font-semibold uppercase tracking-[0.08em] hover:text-primary">
          {label}{on && (sort.dir === "desc" ? <ArrowDown className="size-3.5" aria-hidden="true" /> : <ArrowUp className="size-3.5" aria-hidden="true" />)}
        </button>{extra}
      </th>
    );
  };
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2" aria-label="Filter by topic">
        <span className="text-sm font-semibold">Topics</span>
        {facets.map(({ topic, count }) => (
          <button key={topic} type="button" aria-pressed={topics.includes(topic)} onClick={() => toggleTopic(topic)}
            className={cn("rounded-full px-3 py-1 text-xs font-semibold ring-1", topics.includes(topic) ? "bg-primary text-primary-foreground ring-primary" : "ring-line hover:ring-input")}
            style={topics.includes(topic) ? undefined : { background: vibeOf(topic).soft }}>
            {topic} <span className="tabular-nums opacity-70">{count}</span>
          </button>
        ))}
      </div>
      {topics.length > 0 && (
        <div role="status" className="mt-3 flex flex-wrap items-center gap-2 rounded-[8px] bg-secondary p-2 text-sm">
          <span className="font-semibold">Showing {rows.length} of {g.shows.length} with</span>
          {topics.map((t) => (
            <button key={t} type="button" onClick={() => toggleTopic(t)} className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground" aria-label={`Remove filter ${t}`}>
              {t}<X className="size-3" aria-hidden="true" />
            </button>
          ))}
          <button type="button" onClick={() => setTopics([])} className="ml-auto px-2 font-semibold underline">Clear</button>
          <span className="text-xs text-muted-foreground">or press Esc</span>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Tick 2 or 3 shows to compare them side by side.</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onExport("csv")}><Download aria-hidden="true" />CSV</Button>
          <Button variant="outline" onClick={() => onExport("html")}><FileText aria-hidden="true" />Report</Button>
        </div>
      </div>
      <div className="mt-3 overflow-x-auto rounded-[10px] border border-line bg-card">
        <table className="w-full min-w-[56rem] text-sm">
          <caption className="sr-only">Podcasts whose audiences share your guest&apos;s taste, from Qloo</caption>
          <thead className="border-b border-line bg-paper text-xs">
            <tr>
              <th scope="col" className="w-10 px-3 py-2"><span className="sr-only">Compare</span></th>
              <th scope="col" className="w-8 px-1 py-2 text-left">#</th>
              {head("name", "Podcast")}
              {head("affinity", "Affinity")}
              {head("popularity", "Popularity", <sup aria-hidden="true">*</sup>)}
              <th scope="col" className="px-3 py-2 text-left font-semibold uppercase tracking-[0.08em]">Topics</th>
              <th scope="col" className="px-3 py-2 text-left font-semibold uppercase tracking-[0.08em]">Saved</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s, i) => {
              const checked = compare.includes(s.id);
              const saved = g.isSaved(s.id);
              return (
                <tr key={s.id} className={cn("border-b border-line last:border-0 hover:bg-paper", g.selectedId === s.id && "bg-accent")}>
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={checked} disabled={!checked && compare.length >= 3} onChange={() => setCompare(checked ? compare.filter((x) => x !== s.id) : [...compare, s.id])}
                      aria-label={`Compare ${s.name}`} className="size-4 accent-[var(--primary)]" />
                  </td>
                  <td className="px-1 py-2 tabular-nums text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => onOpen(s.id)} className="flex items-center gap-3 text-left hover:underline" aria-label={`${s.name}: open receipt and pitch`}>
                      <Cover src={s.image} seed={s.id} alt="" className="size-11" rounded="rounded-[6px]" />
                      <span className="min-w-0">
                        <span className="line-clamp-1 font-semibold">{s.name}</span>
                        {s.channel && <span className="line-clamp-1 text-xs text-muted-foreground">{s.channel}</span>}
                      </span>
                    </button>
                  </td>
                  <td className="px-3 py-2 tabular-nums">{s.overlap !== undefined ? s.overlap.toFixed(2) : <span className="text-muted-foreground">n/a</span>}</td>
                  <td className="px-3 py-2 tabular-nums">{s.popularity !== undefined ? s.popularity.toFixed(2) : <span className="text-muted-foreground">n/a</span>}</td>
                  <td className="px-3 py-2">
                    <span className="flex flex-wrap gap-1">
                      {(s.topics ?? []).slice(0, 3).map((t) => (
                        <button key={t} type="button" onClick={() => toggleTopic(t)} aria-pressed={topics.includes(t)} className="rounded-full px-2 py-0.5 text-xs font-semibold hover:ring-1 hover:ring-input" style={{ background: vibeOf(t).soft }}>{t}</button>
                      ))}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <button type="button" aria-pressed={saved} aria-label={saved ? `Remove ${s.name} from saved` : `Save ${s.name}`} onClick={() => g.toggleSave(s)} className="grid size-9 place-items-center rounded-[6px] text-coral-ink hover:bg-secondary">
                      <Bookmark className={cn("size-4", saved && "fill-current")} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground"><sup>*</sup> {POPULARITY_NOTE} Affinity is Qloo&apos;s 0-1 taste alignment for your combined picks, not listener overlap.</p>
    </div>
  );
}

// ---------- 2. How did Qloo shape this list?

interface Without { name: string; state: string; kept?: number; left?: string[]; entered?: string[]; error?: string }

export function InfluencePanel({ g }: { g: GreenRoom }) {
  const run = g.run!;
  const b = g.brief!;
  const names = [b.work, ...b.seeds.filter((s) => s !== b.work)];
  const [st, setSt] = useState<{ loading: boolean; data?: { without: Without[]; topCount: number; queryId: string }; error?: string }>({ loading: false });
  const canTest = run.seedIds.length >= 2 && run.seedIds.length === names.length && run.mode === "live";
  const test = async () => {
    setSt({ loading: true });
    try {
      const res = await fetch("/api/influence", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ names, ids: run.seedIds }) });
      const j = await res.json();
      setSt(j.state === "ok" ? { loading: false, data: j } : { loading: false, error: j.retryAfterSeconds ? `rate limited, retry in ${j.retryAfterSeconds}s` : (j.error ?? j.state ?? "unavailable") });
    } catch {
      setSt({ loading: false, error: "request_failed" });
    }
  };
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-[10px] border border-line bg-card p-5">
        <h3 className="font-semibold">Each pick&apos;s effect on the top 10</h3>
        {run.influence.length ? (
          <ul className="mt-3 space-y-2">
            {run.influence.map((r, i) => (
              <li key={r.name} className="grid grid-cols-[minmax(0,10rem)_1fr_3rem] items-center gap-3 text-sm">
                <span className="truncate font-semibold">{r.name}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-paper-deep"><span className="bar-grow block h-full rounded-full bg-primary" style={{ width: `${Math.round(Math.min(1, Math.max(0, r.score)) * 100)}%`, "--i": i } as React.CSSProperties} /></span>
                <span className="text-right tabular-nums">{r.score.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-sm text-muted-foreground">Qloo returned no explainability for this run.</p>}
        <p className="mt-3 text-xs text-muted-foreground">Qloo explainability (<code>effect_on_top10_recs</code>), from the same request as the table.</p>
        {run.ignoredSeeds.length > 0 && <p className="mt-2 text-xs font-semibold text-sample">Not used as a signal: {run.ignoredSeeds.join(", ")}.</p>}
      </div>
      <div className="rounded-[10px] border border-line bg-card p-5">
        <h3 className="font-semibold">With and without each pick</h3>
        <p className="mt-1 text-sm text-muted-foreground">Re-asks Qloo once per pick, leaving it out, and compares which shows stay in the top 10. Costs {names.length + 2} Qloo requests (one re-verification, the full list, one per pick).</p>
        {!canTest ? (
          <p className="mt-3 text-sm">{run.mode !== "live" ? "Available on live data only." : "Add a second pick to the brief to test its influence."}</p>
        ) : !st.data ? (
          <Button className="mt-3" variant="outline" onClick={test} disabled={st.loading}><Scale aria-hidden="true" />{st.loading ? "Asking Qloo…" : "Test without each pick"}</Button>
        ) : (
          <ul className="mt-3 space-y-3 text-sm">
            {st.data.without.map((w) => (
              <li key={w.name}>
                <p className="font-semibold">Without {w.name}: {w.state === "ok" ? `${w.kept} of the top ${st.data!.topCount} ${w.kept === 1 ? "stays" : "stay"}` : `unavailable (${w.error ?? w.state})`}</p>
                {w.state === "ok" && (
                  <p className="text-muted-foreground">{w.entered?.length ? `Joins: ${w.entered.slice(0, 3).join(", ")}${w.entered.length > 3 ? "…" : ""}. ` : ""}{w.left?.length ? `Drops: ${w.left.slice(0, 3).join(", ")}${w.left.length > 3 ? "…" : ""}.` : "Nothing drops."}</p>
                )}
              </li>
            ))}
          </ul>
        )}
        {st.error && <p role="status" className="mt-2 text-sm font-semibold text-alert">Influence test unavailable: {st.error}. The table above is unchanged.</p>}
      </div>
    </div>
  );
}

// ---------- 3. Comparator

interface CompareData { ranking: { status: string; queryId: string; data: { id: string; provenance: { affinity?: number } }[] | null }; audience: Record<string, unknown>; angles: Record<string, unknown> }

export function Comparator({ g, ids, onClose }: { g: GreenRoom; ids: string[]; onClose: () => void }) {
  const [st, setSt] = useState<{ loading: boolean; data?: CompareData; error?: string }>({ loading: false });
  const shows = ids.map((id) => g.shows.find((s) => s.id === id)).filter((s): s is UiShow => !!s);
  const run = g.run!;
  const load = async () => {
    setSt({ loading: true });
    const q = new URLSearchParams({ seeds: run.seedIds.join(","), shows: ids.join(","), ...(run.workId && { work: run.workId }) });
    try {
      const res = await fetch(`/api/compare?${q}`);
      const j = await res.json();
      setSt(j.ranking ? { loading: false, data: j } : { loading: false, error: j.retryAfterSeconds ? `rate limited, retry in ${j.retryAfterSeconds}s` : (j.error ?? "unavailable") });
    } catch {
      setSt({ loading: false, error: "request_failed" });
    }
  };
  const together = (id: string) => st.data?.ranking.data?.find((r) => r.id === id)?.provenance.affinity;
  return (
    <div className="rounded-[10px] border border-line bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{shows.length} shows. Ranking them in one Qloo request makes their affinities comparable; audience and shared themes are optional extras.</p>
        <div className="flex gap-2">
          {!st.data && <Button onClick={load} disabled={st.loading || run.seedIds.length === 0}><Scale aria-hidden="true" />{st.loading ? "Asking Qloo…" : "Compare with Qloo"}</Button>}
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
      <div className={cn("mt-5 grid gap-4", shows.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
        {shows.map((s) => {
          const aud: Enrichment<UiAudience> | null = st.data ? adaptAudience(st.data.audience[s.id]) : null;
          const ang: Enrichment<UiAngle[]> | null = st.data ? adaptAngles(st.data.angles[s.id]) : null;
          const v = together(s.id);
          return (
            <article key={s.id} className="rounded-[8px] bg-paper p-4">
              <div className="flex items-center gap-3">
                <Cover src={s.image} seed={s.id} alt="" className="size-14" rounded="rounded-[6px]" />
                <h3 className="line-clamp-2 font-display text-lg leading-snug">{s.name}</h3>
              </div>
              <dl className="mt-4 space-y-3 text-sm">
                <div><dt className="eyebrow">Affinity, ranked together</dt><dd className="mt-0.5 font-display text-2xl tabular-nums">{st.data ? (v !== undefined ? v.toFixed(2) : "n/a") : "–"}</dd></div>
                <div><dt className="eyebrow">Topics</dt><dd className="mt-1 flex flex-wrap gap-1">{(s.topics ?? []).slice(0, 4).map((t) => <span key={t} className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: vibeOf(t).soft }}>{t}</span>)}{!s.topics?.length && <span className="text-muted-foreground">None from Qloo</span>}</dd></div>
                <div><dt className="eyebrow">Shared with your work</dt><dd className="mt-1">{!ang ? "–" : ang.state === "ok" ? ang.data.map((a) => a.tag).join(", ") : ang.state === "empty" ? <span className="text-muted-foreground">Qloo found none</span> : <span className="text-muted-foreground">Unavailable ({ang.reason})</span>}</dd></div>
                <div><dt className="eyebrow">Audience leans</dt><dd className="mt-1">{!aud ? "–" : aud.state === "ok" ? <AudienceMini a={aud.data} /> : aud.state === "empty" ? <span className="text-muted-foreground">Qloo returned none</span> : <span className="text-muted-foreground">Unavailable ({aud.reason})</span>}</dd></div>
              </dl>
            </article>
          );
        })}
      </div>
      {st.data && <p className="mt-3 font-mono text-xs text-muted-foreground">One Qloo request: query {st.data.ranking.queryId} · {st.data.ranking.status}</p>}
      {st.error && <p role="status" className="mt-3 text-sm font-semibold text-alert">Compare unavailable: {st.error}.</p>}
    </div>
  );
}

function AudienceMini({ a }: { a: UiAudience }) {
  const age = a.age.filter((x) => x.share > 0).slice(0, 3);
  const lead = a.gender.find((x) => x.share > 0);
  return (
    <span className="block">
      {lead && <span className="block">Leans {lead.label}</span>}
      {age.length > 0 && <span className="block text-muted-foreground">Ages: {age.map((x) => x.label).join(", ")}</span>}
      {!lead && !age.length && <span className="text-muted-foreground">No positive leaning</span>}
    </span>
  );
}

// ---------- 4. Where do they live? (heatmap)

interface Cell { lat: number; lon: number; affinity: number }
const BOUNDS = { west: -125, east: -66, south: 24, north: 50 }; // contiguous United States

export function HeatmapPanel({ g }: { g: GreenRoom }) {
  const [showId, setShowId] = useState(g.shows[0]?.id ?? "");
  const [st, setSt] = useState<{ loading: boolean; cells?: Cell[]; retrievedAt?: string; queryId?: string; error?: string; for?: string }>({ loading: false });
  const load = async () => {
    setSt({ loading: true });
    try {
      const j = await (await fetch(`/api/heatmap?show=${encodeURIComponent(showId)}`)).json();
      const h = j.heatmap;
      if (h?.status === "ok" && Array.isArray(h.data)) setSt({ loading: false, cells: h.data, retrievedAt: h.retrievedAt, queryId: h.queryId, for: showId });
      else setSt({ loading: false, error: j.retryAfterSeconds ? `rate limited, retry in ${j.retryAfterSeconds}s` : (h?.error ?? h?.status ?? "unavailable") });
    } catch {
      setSt({ loading: false, error: "request_failed" });
    }
  };
  const W = 720, H = 360;
  const x = (lon: number) => ((lon - BOUNDS.west) / (BOUNDS.east - BOUNDS.west)) * W;
  const y = (lat: number) => ((BOUNDS.north - lat) / (BOUNDS.north - BOUNDS.south)) * H;
  const cells = (st.cells ?? []).filter((c) => c.lon >= BOUNDS.west && c.lon <= BOUNDS.east && c.lat >= BOUNDS.south && c.lat <= BOUNDS.north);
  const sorted = [...cells].sort((a, b) => a.affinity - b.affinity);
  const cut = sorted.length ? sorted[Math.floor(sorted.length * 0.9)].affinity : 1;
  const name = g.shows.find((s) => s.id === (st.for ?? showId))?.name;
  return (
    <div className="rounded-[10px] border border-line bg-card p-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm font-semibold">Show
          <select value={showId} onChange={(e) => setShowId(e.target.value)} className="mt-1 block h-11 max-w-sm rounded-[6px] border border-input bg-paper px-2 font-normal">
            {g.shows.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <Button variant="outline" onClick={load} disabled={st.loading || !showId}><MapPin aria-hidden="true" />{st.loading ? "Asking Qloo…" : "Map its fans"}</Button>
        <p className="text-xs text-muted-foreground">One Qloo request (Heatmap insights, United States). Useful for planning book-tour stops.</p>
      </div>
      {st.cells && (
        <figure className="mt-4">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Taste heatmap for ${name}: ${cells.length} Qloo cells in the contiguous United States; the top tenth by affinity is highlighted.`} className="w-full rounded-[8px] bg-paper">
            {sorted.map((c, i) => {
              const top = c.affinity >= cut;
              return <circle key={i} cx={x(c.lon)} cy={y(c.lat)} r={top ? 3.4 : 2.2} fill={top ? "var(--coral)" : "var(--forest)"} opacity={top ? 0.95 : 0.12 + 0.5 * Math.max(0, Math.min(1, c.affinity))} />;
            })}
          </svg>
          <figcaption className="mt-2 text-xs text-muted-foreground">
            Each dot is a Qloo geohash cell for {name}; coral marks the top tenth by Qloo affinity. Taste concentration, not listener counts. Query {st.queryId} · {st.retrievedAt && formatRetrieved(st.retrievedAt)}.
          </figcaption>
        </figure>
      )}
      {st.error && <p role="status" className="mt-3 text-sm font-semibold text-alert">Heatmap unavailable: {st.error}.</p>}
      <p className="mt-3 text-xs text-muted-foreground">Trend lines are not shown: Qloo&apos;s Trending endpoint returned no podcast data when checked live on 30 Oct 2026.</p>
    </div>
  );
}

// ---------- 5. Model-only baseline

export function BaselinePanel({ g }: { g: GreenRoom }) {
  const [st, setSt] = useState<{ loading: boolean; names?: string[]; model?: string; error?: string }>({ loading: false });
  const b = g.brief!;
  const ask = async () => {
    setSt({ loading: true });
    try {
      const j = await (await fetch("/api/baseline", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ work: b.work, seeds: b.seeds }) })).json();
      const r = j.baseline;
      setSt(r?.status === "ok" ? { loading: false, names: r.data, model: r.model } : { loading: false, error: r?.reason ?? j.error ?? "unavailable" });
    } catch {
      setSt({ loading: false, error: "request_failed" });
    }
  };
  const qloo = g.shows.slice(0, 8);
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const both = st.names ? st.names.filter((n) => qloo.some((s) => norm(s.name) === norm(n))).length : 0;
  return (
    <div className="rounded-[10px] border border-line bg-card p-5">
      <p className="text-sm text-muted-foreground">The same brief, answered by a language model alone. Shown side by side so you can judge what Qloo adds; neither list is labelled better.</p>
      <div className="mt-4 grid grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold">With Qloo audience data</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">{qloo.map((s) => <li key={s.id}>{s.name} <span className="tabular-nums text-muted-foreground">· {s.overlap !== undefined ? s.overlap.toFixed(2) : "n/a"}</span></li>)}</ol>
          <p className="mt-2 text-xs text-muted-foreground">Each name has a Qloo entity, a query id and a retrieval time.</p>
        </div>
        <div>
          <h3 className="font-semibold">Model only, no Qloo</h3>
          {st.names ? (
            <>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">{st.names.map((n) => <li key={n}>{n}</li>)}</ol>
              <p className="mt-2 text-xs text-muted-foreground">{st.model}. Names not verified, no entity ids, no scores. {both} of {st.names.length} also {both === 1 ? "appears" : "appear"} in the Qloo top 8.</p>
            </>
          ) : (
            <Button className="mt-2" variant="outline" onClick={ask} disabled={st.loading}>{st.loading ? "Asking the model…" : "Ask a model without Qloo"}</Button>
          )}
          {st.error && <p role="status" className="mt-2 text-sm font-semibold text-sample">{st.error === "missing ANTHROPIC_API_KEY" ? "Claude is not configured on this server, so the baseline cannot run." : `Baseline unavailable: ${st.error}.`}</p>}
        </div>
      </div>
    </div>
  );
}
