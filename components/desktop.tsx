// desktop.tsx: the web campaign desk (>=1024px). The publicist compares, filters, justifies and delivers: brief and
// taste analysis, then one section per question (where are my fans, how Qloo shaped the list, compare, where they
// live, model-only baseline), a receipt + Pitch Studio sheet with JEV review, and CSV / HTML export with provenance.
"use client";

import { useEffect, useState } from "react";
import { Bookmark, Check, History, Search, Sparkles } from "lucide-react";
import { Botanical, Collage, LeafMark } from "./art";
import { CandidateBadgeTag } from "./candidate-badge";
import { Cover, FitRing, vibeOf } from "./cover";
import { BaselinePanel, Comparator, FanTable, HeatmapPanel, InfluencePanel, Section } from "./desk";
import { RunNotice } from "./run-states";
import { AFFINITY_NOTE, ModeBadge, POPULARITY_NOTE } from "./status";
import { PitchStudio } from "./studio";
import type { GreenRoom } from "./use-green-room";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { candidateBadge, pickHint } from "@/lib/ui/candidates";
import { searchWithTopics, topicsFromSearch } from "@/lib/ui/desk";
import { toCsv, toHtmlReport } from "@/lib/ui/export";
import { formatRetrieved } from "@/lib/ui/format";
import type { UiShow } from "@/lib/ui/types";
import { cn } from "@/lib/utils";

type View = "desk" | "saved";

function download(name: string, type: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "shortlist";

export function DesktopApp({ g }: { g: GreenRoom }) {
  const [view, setView] = useState<View>("desk");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [topics, setTopicsState] = useState<string[]>([]);
  const [compare, setCompare] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);

  // The topic filter lives in the URL (?topic=...), so a filtered desk can be reloaded or shared.
  useEffect(() => setTopicsState(topicsFromSearch(window.location.search)), []);
  const setTopics = (t: string[]) => {
    setTopicsState(t);
    window.history.replaceState(null, "", `${window.location.pathname}${searchWithTopics(window.location.search, t)}`);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("[role=dialog]") && topics.length) setTopics([]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setCompare([]); setComparing(false); }, [g.run]);

  const open = (id: string) => { g.setSelectedId(id); setSheetOpen(true); };
  const ok = !g.busy && !!g.run && g.shows.length > 0 && (g.run.state === "ok" || g.run.state === "partial");
  const brief = g.brief;

  const exportAs = (kind: "csv" | "html") => {
    if (!brief || !g.run) return;
    const name = `green-room-${slug(brief.work)}`;
    if (kind === "csv") download(`${name}.csv`, "text/csv;charset=utf-8", toCsv(g.shows, g.isSaved));
    else download(`${name}.html`, "text/html;charset=utf-8", toHtmlReport(g.shows, { work: brief.work, seeds: brief.seeds, mode: g.run.mode, recordedAt: g.run.recordedAt }, new Date().toISOString()));
  };

  return (
    <div className="grid min-h-dvh grid-cols-[14rem_minmax(0,1fr)] bg-forest">
      <Sidebar view={view} setView={setView} g={g} />

      <main className="min-w-0 bg-paper px-8 py-10 xl:px-12">
        <div className="mx-auto max-w-6xl">
          {view === "saved" ? (
            <SavedGrid g={g} onOpen={open} />
          ) : (
            <>
              <p className="eyebrow">Campaign desk</p>
              <h1 className="rise headline mt-1 max-w-3xl text-5xl">Find the conversation your story deserves.</h1>
              <div className="mt-8">{g.run && brief && !g.busy && g.run.state !== "needs_confirmation" && g.run.state !== "cancelled" ? <Campaign g={g} /> : <BriefCard g={g} />}</div>
              {g.run?.state === "needs_confirmation" && !g.busy && <Confirm g={g} />}
              <div className="mt-6 max-w-4xl">{g.run && !g.busy && <RunNotice run={g.run} />}</div>
              {g.busy && <LoadingRows />}
              {ok && (
                <>
                  <Section n={1} id="q-fans" q="Where are my fans?" hint={`${g.shows.length} podcasts from Qloo whose audiences share your guest's taste. Sort any column, click a topic to filter everything, open a row for its receipt and pitch.`}>
                    <FanTable g={g} topics={topics} setTopics={setTopics} compare={compare} setCompare={setCompare} onOpen={open} onExport={exportAs} />
                    {compare.length >= 2 && !comparing && (
                      <div className="sticky bottom-4 z-10 mt-4 flex items-center justify-between rounded-[10px] bg-forest p-3 pl-5 text-on-dark shadow-xl">
                        <span className="text-sm font-semibold">{compare.length} shows selected</span>
                        <Button onClick={() => { setComparing(true); setTimeout(() => document.getElementById("q-compare")?.scrollIntoView({ behavior: "smooth" }), 50); }} className="bg-paper text-forest hover:bg-on-dark">Compare side by side</Button>
                      </div>
                    )}
                  </Section>
                  <Section n={2} id="q-shape" q="How did Qloo shape this list?" hint="Which of your picks moved the results, and what changes without each one.">
                    <InfluencePanel g={g} />
                  </Section>
                  {comparing && compare.length >= 2 && (
                    <Section n={3} id="q-compare" q="How do these shows compare?">
                      <Comparator g={g} ids={compare} onClose={() => setComparing(false)} />
                    </Section>
                  )}
                  <Section n={comparing ? 4 : 3} id="q-where" q="Where do their fans live?">
                    <HeatmapPanel g={g} />
                  </Section>
                  <Section n={comparing ? 5 : 4} id="q-baseline" q="What would a model guess without Qloo?">
                    <BaselinePanel g={g} />
                  </Section>
                </>
              )}
            </>
          )}
        </div>
      </main>

      <Sheet open={sheetOpen && !!g.selected} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full overflow-y-auto bg-paper sm:max-w-2xl">
          {g.selected && <ShowSheet g={g} show={g.selected} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Sidebar({ view, setView, g }: { view: View; setView: (v: View) => void; g: GreenRoom }) {
  const item = (v: View, label: string, Icon: typeof Search, extra?: React.ReactNode) => (
    <button
      type="button" aria-current={view === v ? "page" : undefined} onClick={() => setView(v)}
      className={cn("flex h-11 w-full items-center gap-3 rounded-[6px] px-3 text-left text-[0.9375rem] font-semibold transition-colors", view === v ? "bg-on-dark-line text-on-dark" : "text-on-dark-muted hover:bg-forest-2 hover:text-on-dark")}
    >
      <Icon className="size-4" aria-hidden="true" />{label}{extra}
    </button>
  );
  return (
    <aside className="on-dark sticky top-0 flex h-dvh flex-col overflow-hidden px-4 py-8">
      <div className="flex items-center gap-2.5 px-1">
        <LeafMark className="size-7 text-sage [--leaf-vein:var(--forest)]" />
        <span className="font-display text-2xl">Green Room</span>
      </div>
      <p className="mt-1 px-1 text-xs uppercase tracking-[0.18em] text-on-dark-muted">Podcast outreach for real ideas</p>
      <nav aria-label="Main" className="mt-10 space-y-1">
        {item("desk", "Campaign desk", Search)}
        {item("saved", "Saved", Bookmark, g.saved.length > 0 && <span className="ml-auto rounded-full bg-[#b8432c] px-2 text-xs text-white">{g.saved.length}</span>)}
      </nav>
      {g.health?.tour_present && (
        <button type="button" onClick={() => { setView("desk"); void g.tour(); }} disabled={g.busy} className="relative z-10 mt-6 flex items-center gap-2 rounded-[6px] border border-on-dark-line px-3 py-2 text-left text-sm font-semibold text-on-dark hover:bg-forest-2">
          <History className="size-4 shrink-0" aria-hidden="true" /><span>Take the tour<span className="block text-xs font-normal text-on-dark-muted">Recorded real run, no live request</span></span>
        </button>
      )}
      <p className="relative z-10 mt-8 px-1 text-xs leading-relaxed text-on-dark-muted">Green Room drafts pitches. It never sends email.</p>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 opacity-80"><Botanical /></div>
    </aside>
  );
}

function BriefCard({ g }: { g: GreenRoom }) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); g.submit(); }} className="rise grid max-w-5xl grid-cols-[12rem_minmax(0,1fr)] overflow-hidden rounded-[12px] border border-line bg-card" style={{ "--i": 2 } as React.CSSProperties}>
      <div className="relative"><Collage className="absolute inset-0" /></div>
      <div className="space-y-4 p-7">
        <p className="eyebrow">Your campaign</p>
        <div className="grid gap-4 xl:grid-cols-2">
          <label className="block text-sm font-semibold">Your guest&apos;s work
            <input value={g.work} onChange={(e) => g.setWork(e.target.value)} maxLength={200} placeholder="A book, film, album or brand" className="mt-1.5 block h-12 w-full rounded-[6px] border border-input bg-paper px-3 text-base font-normal focus:border-primary focus:outline-none" />
          </label>
          <label className="block text-sm font-semibold">Fans also love <span className="font-normal text-muted-foreground">(up to 3, comma-separated)</span>
            <input value={g.seeds} onChange={(e) => g.setSeeds(e.target.value)} maxLength={200} placeholder="Nike, Radiohead" className="mt-1.5 block h-12 w-full rounded-[6px] border border-input bg-paper px-3 text-base font-normal focus:border-primary focus:outline-none" />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" disabled={g.busy || !g.work.trim()} aria-describedby="brief-hint"><Search aria-hidden="true" />Find live matches</Button>
          <button type="button" onClick={g.demo} disabled={g.busy} className="relative inline-flex h-14 items-center gap-2 overflow-hidden rounded-[3px] bg-gradient-to-r from-[#b8432c] via-[#8a4a00] to-[#6b3a7a] px-6 font-semibold text-white disabled:opacity-50">
            <span aria-hidden="true" className="shine absolute inset-0" />
            <Sparkles className="relative size-4" aria-hidden="true" /><span className="relative">Try the demo · live data</span>
          </button>
        </div>
        <p id="brief-hint" role="status" className="text-sm text-muted-foreground">
          {!g.work.trim() && !g.busy ? "Type your guest's work to search live, or try the demo." : null}
        </p>
      </div>
    </form>
  );
}

function Campaign({ g }: { g: GreenRoom }) {
  const b = g.brief!;
  const run = g.run!;
  return (
    <section className="rise grid max-w-5xl grid-cols-[12rem_minmax(0,1fr)] overflow-hidden rounded-[12px] border border-line bg-card">
      <div className="relative min-h-44">{g.workCover ? <Cover src={g.workCover} seed={b.work} alt={`${b.work} cover`} className="absolute inset-0 size-full" rounded="rounded-none" /> : <Collage className="absolute inset-0" />}</div>
      <div className="p-7">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="eyebrow">{b.tour ? "Recorded tour" : b.demo ? "Demo campaign" : "Your campaign"}</p>
            <h2 className="mt-2 font-display text-4xl leading-tight">{b.work}</h2>
          </div>
          <Button variant="outline" onClick={g.reset}>Edit brief</Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {run.mode && <ModeBadge mode={run.mode} />}
          {run.recordedAt && <span className="text-xs text-muted-foreground">captured {formatRetrieved(run.recordedAt)}</span>}
          {b.seeds.map((s) => <span key={s} className="rounded-full px-3 py-0.5 text-sm font-semibold" style={{ background: vibeOf(s).soft }}>{s}</span>)}
          {b.tags.map((t) => <span key={t.id} className="rounded-full border border-primary px-3 py-0.5 text-sm font-semibold text-primary">+ {t.name}</span>)}
        </div>
        {run.taste.length > 0 && (
          <div className="mt-5">
            <p className="text-sm font-semibold">What fans of {b.work} are into <span className="font-normal text-muted-foreground">· Qloo taste analysis</span></p>
            <div className="mt-2 flex flex-wrap gap-1.5">{run.taste.map((t) => <span key={t.id} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold">{t.name}</span>)}</div>
          </div>
        )}
      </div>
    </section>
  );
}

function Confirm({ g }: { g: GreenRoom }) {
  const run = g.run!;
  return (
    <section className="rise mt-6 max-w-5xl rounded-[12px] border border-line bg-card p-7">
      <h2 className="font-display text-3xl">Which one did you mean?</h2>
      <p className="mt-1 text-muted-foreground">Qloo found several matches. Pick one per name; Green Room never chooses an ID for you, and re-checks your pick with Qloo. &ldquo;Qloo&apos;s top match&rdquo; is Qloo&apos;s first search result; &ldquo;Claude suggests&rdquo; is a second opinion.</p>
      {run.candidates.map((group) => (
        <fieldset key={group.name} className="mt-6">
          <legend className="text-lg font-semibold">&ldquo;{group.name}&rdquo;</legend>
          <div className="mt-3 grid grid-cols-5 gap-3">
            {group.options.map((o, i) => {
              const on = g.choices[group.name] === o.id;
              const badge = candidateBadge(i, o.id, g.suggestions[group.name]);
              return (
                <button key={o.id} type="button" role="radio" aria-checked={on} onClick={() => g.choose(group.name, o)}
                  className={cn("pop relative rounded-[8px] bg-paper p-2 text-left", on ? "ring-4 ring-primary" : "ring-1 ring-line hover:ring-input")} style={{ "--i": i } as React.CSSProperties}>
                  <Cover src={o.image} seed={o.id} alt="" className="aspect-[3/4] w-full" rounded="rounded-[6px]" />
                  {on && <span className="pop absolute right-3 top-3 grid size-7 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="size-4" aria-hidden="true" /></span>}
                  <CandidateBadgeTag badge={badge} />
                  <span className="mt-2 line-clamp-3 text-sm font-semibold leading-snug">{o.name}</span>
                  {(o.kind || o.detail) && <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{[o.kind, o.detail].filter(Boolean).join(" · ")}</span>}
                  {o.tags?.length ? <span className="mt-1 line-clamp-2 text-xs text-muted-foreground">{o.tags.join(", ")}</span> : null}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button size="lg" disabled={!g.ready} onClick={g.confirm} aria-describedby="pick-hint">Confirm and build list</Button>
        <Button size="lg" variant="outline" onClick={g.cancel}>Cancel</Button>
        <p id="pick-hint" role="status" className="text-sm text-muted-foreground">{pickHint(run.candidates, g.choices)}</p>
      </div>
    </section>
  );
}

function LoadingRows() {
  return (
    <div role="status" aria-label="Asking Qloo" className="mt-10 space-y-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="relative h-14 overflow-hidden rounded-[8px] bg-paper-deep"><span className="shine absolute inset-0" /></div>
      ))}
    </div>
  );
}

function SavedGrid({ g, onOpen }: { g: GreenRoom; onOpen: (id: string) => void }) {
  return (
    <>
      <h1 className="headline text-5xl">Saved</h1>
      <p className="mt-3 text-lg text-muted-foreground">Matches you kept, stored in this browser only.</p>
      {g.saved.length === 0 ? (
        <p className="mt-10 text-lg">Nothing saved yet. Use the bookmark on any row.</p>
      ) : (
        <ul className="mt-8 grid grid-cols-4 gap-5">
          {g.saved.map((s, i) => (
            <li key={s.id} className="pop" style={{ "--i": i } as React.CSSProperties}>
              <button type="button" onClick={() => onOpen(s.id)} className="block w-full rounded-[12px] p-3 text-left text-white" style={{ background: vibeOf(s.id).fill }}>
                <Cover src={s.image} seed={s.id} alt="" className="aspect-square w-full" rounded="rounded-[8px]" />
                <span className="mt-2 line-clamp-2 font-display text-lg leading-snug">{s.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ShowSheet({ g, show }: { g: GreenRoom; show: UiShow }) {
  const e = g.enrichment;
  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-4">
          <Cover src={show.image} seed={show.id} alt={`${show.name} cover`} className="size-20" rounded="rounded-[8px]" />
          <div className="min-w-0">
            <SheetTitle className="font-display text-3xl font-normal leading-tight">{show.name}</SheetTitle>
            <SheetDescription>{show.channel ?? "Receipt and Pitch Studio"}</SheetDescription>
          </div>
        </div>
      </SheetHeader>
      {/* What matters for the decision first; the technical receipt stays one click away. */}
      <div className="mt-6 grid grid-cols-[auto_1fr] items-center gap-4">
        <span style={{ color: vibeOf(show.id).fill }}><FitRing value={show.overlap} size={64} stroke={vibeOf(show.id).fill} /></span>
        <div className="min-w-0">
          {show.description && <p className="leading-relaxed">{show.description}</p>}
          <p className="mt-1 text-xs text-muted-foreground">{AFFINITY_NOTE}</p>
        </div>
      </div>
      <div className="mt-5 space-y-3 border-t border-line pt-4 text-sm">
        <div>
          <p className="font-semibold">{e.angles?.state === "ok" ? "Shared themes" : "Qloo topics"}{e.loading && <span className="font-normal text-muted-foreground"> · checking shared themes…</span>}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(e.angles?.state === "ok" ? e.angles.data.map((a) => a.tag) : show.topics ?? []).map((t) => <span key={t} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold">{t}</span>)}
            {e.angles?.state !== "ok" && !show.topics?.length && <span className="text-muted-foreground">None returned</span>}
          </div>
        </div>
        {(e.loading || e.audience?.state === "ok") && (
          <p><span className="font-semibold">Who listens: </span>{e.loading ? "Loading…" : e.audience?.state === "ok" ? `${e.audience.data.gender.find((x) => x.share > 0)?.label ?? "no gender lean"}; ages ${e.audience.data.age.filter((x) => x.share > 0).slice(0, 3).map((x) => x.label).join(", ") || "none"}` : null}</p>
        )}
      </div>
      <details className="group mt-4 rounded-[8px] border border-line bg-paper px-4 py-2 text-sm">
        <summary className="flex min-h-11 cursor-pointer items-center justify-between font-semibold">Qloo receipt <ModeBadge mode={show.mode} short /></summary>
        <dl className="grid grid-cols-[9rem_minmax(0,1fr)] gap-x-4 gap-y-2 pb-2 pt-1">
          {show.popularity !== undefined && (<><dt className="text-muted-foreground">Popularity index</dt><dd>{show.popularity.toFixed(2)} <span className="text-xs text-muted-foreground">{POPULARITY_NOTE}</span></dd></>)}
          {!e.loading && e.audience?.state !== "ok" && (<><dt className="text-muted-foreground">Who listens</dt><dd>{e.audience?.state === "unavailable" ? `Unavailable (${e.audience.reason})` : "Qloo returned none"}</dd></>)}
          <dt className="text-muted-foreground">Source</dt><dd>{show.provenance.source}</dd>
          <dt className="text-muted-foreground">Query · entity</dt><dd className="break-all font-mono text-xs">{show.provenance.queryId} · {show.provenance.entityId}</dd>
          <dt className="text-muted-foreground">Retrieved</dt><dd>{formatRetrieved(show.provenance.retrievedAt)}</dd>
        </dl>
      </details>
      <h3 className="mt-8 font-display text-2xl">Pitch Studio</h3>
      <p className="mb-4 text-sm text-muted-foreground">Drafted only from the Qloo evidence above, checked by JEV, edited and sent by you.</p>
      <PitchStudio g={g} show={show} />
    </>
  );
}
