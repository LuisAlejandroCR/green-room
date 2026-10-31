// desktop.tsx: the web layout (>=1024px): dark sidebar, ivory workspace with the brief and ranked matches, and the dark
// "Proof, not promise." panel that shows the Qloo evidence behind the selected match. Pitch opens in a sheet.
"use client";

import { useState } from "react";
import { Bookmark, Check, Copy, FileText, Search, Sparkles } from "lucide-react";
import { Botanical, Collage, LeafMark } from "./art";
import { Cover, FitRing, vibeOf } from "./cover";
import { PitchEditor } from "./pitch";
import { RunNotice } from "./run-states";
import { AFFINITY_NOTE, JevStatus, ModeBadge, POPULARITY_NOTE } from "./status";
import type { GreenRoom } from "./use-green-room";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatRetrieved } from "@/lib/ui/format";
import type { UiShow } from "@/lib/ui/types";
import { cn } from "@/lib/utils";

type View = "discover" | "saved";

export function DesktopApp({ g }: { g: GreenRoom }) {
  const [view, setView] = useState<View>("discover");
  const [pitchOpen, setPitchOpen] = useState(false);
  const [all, setAll] = useState(false);
  const selected = g.selected ?? (view === "discover" ? g.shows[0] ?? null : null);
  const select = (id: string) => g.setSelectedId(id);

  return (
    <div className="grid min-h-dvh grid-cols-[15rem_minmax(0,1fr)_22rem] bg-forest">
      <Sidebar view={view} setView={setView} savedCount={g.saved.length} />

      <main className="min-w-0 bg-paper px-8 py-10 xl:px-10">
        {view === "saved" ? (
          <SavedGrid g={g} onOpen={(id) => { select(id); }} />
        ) : (
          <>
            <h1 className="rise headline max-w-2xl text-6xl">Find the conversation your story deserves.</h1>
            <p className="rise mt-4 text-lg text-muted-foreground" style={{ "--i": 1 } as React.CSSProperties}>Real audiences. Shared taste. Evidence you can check.</p>
            <div className="mt-8">{g.run && g.brief && !g.busy && g.run.state !== "needs_confirmation" && g.run.state !== "cancelled" ? <Campaign g={g} /> : <BriefCard g={g} />}</div>
            {g.run?.state === "needs_confirmation" && !g.busy && <Confirm g={g} />}
            <div className="mt-6 max-w-3xl">{g.run && !g.busy && <RunNotice run={g.run} />}</div>
            {g.busy && <LoadingRows />}
            {!g.busy && g.shows.length > 0 && (g.run?.state === "ok" || g.run?.state === "partial") && (
              <section className="mt-10">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-display text-3xl">Top podcast matches</h2>
                  <span className="text-sm text-muted-foreground">Sorted by affinity · {g.shows.length} from Qloo</span>
                </div>
                <ol className="mt-4 space-y-3">
                  {(all ? g.shows : g.shows.slice(0, 10)).map((s, i) => (
                    <MatchRow key={s.id} show={s} i={i} active={selected?.id === s.id} onOpen={() => select(s.id)} g={g} />
                  ))}
                </ol>
                {!all && g.shows.length > 10 && (
                  <Button variant="outline" className="mt-4" onClick={() => setAll(true)}>Show all {g.shows.length}</Button>
                )}
              </section>
            )}
          </>
        )}
      </main>

      <Evidence g={g} show={selected} onPitch={() => setPitchOpen(true)} />

      <Sheet open={pitchOpen && !!selected} onOpenChange={setPitchOpen}>
        <SheetContent className="w-full overflow-y-auto bg-paper sm:max-w-xl">
          {selected && <PitchSheet g={g} show={selected} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Sidebar({ view, setView, savedCount }: { view: View; setView: (v: View) => void; savedCount: number }) {
  const item = (v: View, label: string, Icon: typeof Search, extra?: React.ReactNode) => (
    <button
      type="button" aria-current={view === v ? "page" : undefined} onClick={() => setView(v)}
      className={cn("flex h-11 w-full items-center gap-3 rounded-[6px] px-3 text-left text-[0.9375rem] font-semibold transition-colors", view === v ? "bg-on-dark-line text-on-dark" : "text-on-dark-muted hover:bg-forest-2 hover:text-on-dark")}
    >
      <Icon className="size-4" aria-hidden="true" />{label}{extra}
    </button>
  );
  return (
    <aside className="on-dark sticky top-0 flex h-dvh flex-col overflow-hidden px-5 py-8">
      <div className="flex items-center gap-2.5 px-1">
        <LeafMark className="size-7 text-sage [--leaf-vein:var(--forest)]" />
        <span className="font-display text-2xl">Green Room</span>
      </div>
      <p className="mt-1 px-1 text-xs uppercase tracking-[0.18em] text-on-dark-muted">Podcast outreach for real ideas</p>
      <nav aria-label="Main" className="mt-10 space-y-1">
        {item("discover", "Discover", Search)}
        {item("saved", "Saved", Bookmark, savedCount > 0 && <span className="ml-auto rounded-full bg-[#b8432c] px-2 text-xs text-white">{savedCount}</span>)}
      </nav>
      <p className="relative z-10 mt-10 px-1 font-display text-lg italic leading-snug text-on-dark-muted">&ldquo;Better conversations build a brighter world.&rdquo;</p>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 opacity-80"><Botanical /></div>
    </aside>
  );
}

function BriefCard({ g }: { g: GreenRoom }) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); g.submit(); }} className="rise grid max-w-4xl grid-cols-[11rem_minmax(0,1fr)] xl:grid-cols-[14rem_minmax(0,1fr)] overflow-hidden rounded-[12px] border border-line bg-card" style={{ "--i": 2 } as React.CSSProperties}>
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
          <Button type="submit" size="lg" disabled={g.busy || !g.work.trim()}><Search aria-hidden="true" />Find live matches</Button>
          <button type="button" onClick={g.demo} disabled={g.busy} className="relative inline-flex h-14 items-center gap-2 overflow-hidden rounded-[3px] bg-gradient-to-r from-[#b8432c] via-[#8a4a00] to-[#6b3a7a] px-6 font-semibold text-white disabled:opacity-50">
            <span aria-hidden="true" className="shine absolute inset-0" />
            <Sparkles className="relative size-4" aria-hidden="true" /><span className="relative">Try the demo · live data</span>
          </button>
        </div>
      </div>
    </form>
  );
}

function Campaign({ g }: { g: GreenRoom }) {
  const b = g.brief!;
  return (
    <section className="rise grid max-w-4xl grid-cols-[11rem_minmax(0,1fr)] xl:grid-cols-[14rem_minmax(0,1fr)] overflow-hidden rounded-[12px] border border-line bg-card">
      <div className="relative min-h-44">{g.workCover ? <Cover src={g.workCover} seed={b.work} alt={`${b.work} cover`} className="absolute inset-0 size-full" rounded="rounded-none" /> : <Collage className="absolute inset-0" />}</div>
      <div className="flex items-start justify-between gap-6 p-7">
        <div>
          <p className="eyebrow">{b.demo ? "Demo campaign · live Qloo data" : "Your campaign"}</p>
          <h2 className="mt-2 font-display text-4xl leading-tight">{b.work}</h2>
          {b.seeds.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Fans also love</span>
              {b.seeds.map((s) => <span key={s} className="rounded-full px-3 py-0.5 text-sm font-semibold" style={{ background: vibeOf(s).soft }}>{s}</span>)}
            </div>
          )}
        </div>
        <Button variant="outline" onClick={g.reset}>Edit brief</Button>
      </div>
    </section>
  );
}

function Confirm({ g }: { g: GreenRoom }) {
  const run = g.run!;
  return (
    <section className="rise mt-6 max-w-4xl rounded-[12px] border border-line bg-card p-7">
      <h2 className="font-display text-3xl">Which one did you mean?</h2>
      <p className="mt-1 text-muted-foreground">Qloo found several matches. Pick each one; Green Room never chooses an ID for you.</p>
      {run.candidates.map((group) => (
        <fieldset key={group.name} className="mt-6">
          <legend className="text-lg font-semibold">&ldquo;{group.name}&rdquo;</legend>
          <div className="mt-3 grid grid-cols-5 gap-3">
            {group.options.map((o, i) => {
              const on = g.choices[group.name] === o.id;
              return (
                <button key={o.id} type="button" role="radio" aria-checked={on} onClick={() => g.choose(group.name, o)}
                  className={cn("pop relative rounded-[8px] bg-paper p-2 text-left", on ? "ring-4 ring-primary" : "ring-1 ring-line hover:ring-input")} style={{ "--i": i } as React.CSSProperties}>
                  <Cover src={o.image} seed={o.id} alt="" className="aspect-[3/4] w-full" rounded="rounded-[6px]" />
                  {on && <span className="pop absolute right-3 top-3 grid size-7 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="size-4" aria-hidden="true" /></span>}
                  <span className="mt-2 line-clamp-3 text-sm font-semibold leading-snug">{o.name}</span>
                  {(o.kind || o.detail) && <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{[o.kind, o.detail].filter(Boolean).join(" · ")}</span>}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
      <div className="mt-6 flex gap-3">
        <Button size="lg" disabled={!g.ready} onClick={g.confirm}>Confirm and build list</Button>
        <Button size="lg" variant="outline" onClick={g.cancel}>Cancel</Button>
      </div>
    </section>
  );
}

function LoadingRows() {
  return (
    <div role="status" aria-label="Asking Qloo" className="mt-10 space-y-3">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="relative h-24 overflow-hidden rounded-[10px] bg-paper-deep"><span className="shine absolute inset-0" /></div>
      ))}
    </div>
  );
}

function MatchRow({ show, i, active, onOpen, g }: { show: UiShow; i: number; active: boolean; onOpen: () => void; g: GreenRoom }) {
  const v = vibeOf(show.id);
  const saved = g.isSaved(show.id);
  return (
    <li className={cn("rise flex items-center gap-2 rounded-[10px] border bg-card p-3 pr-2 transition-colors hover:border-input", active ? "border-primary ring-2 ring-primary" : "border-line")} style={{ "--i": i } as React.CSSProperties}>
      <button type="button" onClick={onOpen} aria-current={active || undefined} aria-label={`${show.name}: open receipt`} className="flex min-w-0 flex-1 items-center gap-4 text-left">
        <span className="w-6 shrink-0 text-center font-display text-xl text-muted-foreground">{i + 1}</span>
        <Cover src={show.image} seed={show.id} alt="" className="size-20" rounded="rounded-[8px]" />
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 font-display text-xl leading-snug">{show.name}</span>
          {show.description && <span className="line-clamp-1 text-sm text-muted-foreground">{show.description}</span>}
          {show.topics?.length ? (
            <span className="mt-1.5 flex flex-wrap gap-1.5">{show.topics.slice(0, 3).map((t) => <span key={t} className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: vibeOf(t).soft }}>{t}</span>)}</span>
          ) : null}
        </span>
        <span style={{ color: v.fill }}><FitRing value={show.overlap} size={60} stroke={v.fill} /></span>
        <span className={cn("hidden h-11 shrink-0 items-center rounded-[3px] px-4 text-[0.9375rem] font-semibold 2xl:inline-flex", active ? "bg-primary text-primary-foreground" : "border border-foreground")}>Open receipt</span>
      </button>
      <button type="button" aria-pressed={saved} aria-label={saved ? `Remove ${show.name} from saved` : `Save ${show.name}`} onClick={() => g.toggleSave(show)} className="grid size-11 place-items-center rounded-[6px] text-coral-ink hover:bg-secondary">
        <Bookmark key={String(saved)} className={cn("size-5", saved && "heart-beat fill-current")} aria-hidden="true" />
      </button>
    </li>
  );
}

function SavedGrid({ g, onOpen }: { g: GreenRoom; onOpen: (id: string) => void }) {
  return (
    <>
      <h1 className="headline text-6xl">Saved</h1>
      <p className="mt-3 text-lg text-muted-foreground">Matches you kept, stored in this browser only.</p>
      {g.saved.length === 0 ? (
        <p className="mt-10 text-lg">Nothing saved yet. Use the bookmark on any match.</p>
      ) : (
        <ul className="mt-8 grid grid-cols-3 gap-5">
          {g.saved.map((s, i) => (
            <li key={s.id} className="pop" style={{ "--i": i } as React.CSSProperties}>
              <button type="button" onClick={() => onOpen(s.id)} className={cn("block w-full rounded-[12px] p-3 text-left text-white", g.selectedId === s.id && "ring-4 ring-primary")} style={{ background: vibeOf(s.id).fill }}>
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

function Evidence({ g, show, onPitch }: { g: GreenRoom; show: UiShow | null; onPitch: () => void }) {
  const e = g.enrichment;
  const run = g.run;
  return (
    <aside aria-label="Evidence" className="on-dark sticky top-0 h-dvh overflow-y-auto px-7 py-10">
      <p className="eyebrow">Evidence</p>
      <h2 className="mt-2 font-display text-4xl leading-tight">Proof, not promise.</h2>
      <p className="mt-2 text-sm text-on-dark-muted">See exactly why a podcast matches your campaign, with the source behind it.</p>
      {!show ? (
        <p className="mt-10 text-on-dark-muted">Run a brief or open a match to see its receipt.</p>
      ) : (
        <div key={show.id} className="mt-8 space-y-6">
          <div className="rise flex items-center gap-4">
            <Cover src={show.image} seed={show.id} alt={`${show.name} cover`} className="size-20" rounded="rounded-[8px]" />
            <div className="min-w-0">
              <p className="font-display text-2xl leading-tight">{show.name}</p>
              {show.channel && <p className="text-sm text-on-dark-muted">{show.channel}</p>}
            </div>
          </div>
          <div className="rise flex items-center gap-4" style={{ "--i": 1 } as React.CSSProperties}>
            <span className="text-sage"><FitRing value={show.overlap} size={72} stroke="var(--sage)" track="var(--on-dark-line)" /></span>
            <p className="text-sm text-on-dark-muted">{AFFINITY_NOTE}</p>
          </div>

          <Block title={e.angles?.state === "ok" ? "Shared themes" : "Qloo topics for this show"} i={2}>
            {e.angles?.state === "ok"
              ? <Pills items={e.angles.data.map((a) => a.tag)} />
              : show.topics?.length ? <Pills items={show.topics} /> : <p className="text-sm text-on-dark-muted">Qloo returned no topics.</p>}
            {e.loading && <p className="mt-2 text-xs text-on-dark-muted">Checking shared themes…</p>}
          </Block>

          <Block title="Source" i={3}>
            <p className="text-sm">{show.provenance.source}</p>
            <p className="mt-1 font-mono text-xs text-on-dark-muted">query {show.provenance.queryId} · entity {show.provenance.entityId.slice(0, 8)}…</p>
          </Block>
          <Block title="Retrieved" i={4}><p className="text-sm">{formatRetrieved(show.provenance.retrievedAt)}</p></Block>
          <Block title="Data" i={5}><ModeBadge mode={show.mode} short /></Block>
          {show.popularity !== undefined && (
            <Block title="Qloo popularity index" i={6}>
              <p className="text-sm">{show.popularity.toFixed(2)}</p>
              <p className="mt-1 text-xs text-on-dark-muted">{POPULARITY_NOTE}</p>
            </Block>
          )}
          {run && run.influence.length > 0 && g.shows.includes(show) && (
            <Block title="Your picks that shaped this list" i={7}>
              <ul className="space-y-2">
                {run.influence.map((r, i) => (
                  <li key={r.name} className="grid grid-cols-[minmax(0,8rem)_1fr_2.5rem] items-center gap-3 text-sm">
                    <span className="truncate">{r.name}</span>
                    <span className="h-2 overflow-hidden rounded-full bg-forest-2"><span className="bar-grow block h-full rounded-full bg-sage" style={{ width: `${Math.round(r.score * 100)}%`, "--i": i } as React.CSSProperties} /></span>
                    <span className="text-right tabular-nums text-on-dark-muted">{r.score.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-on-dark-muted">Qloo explainability: each pick&apos;s effect on the top 10.</p>
            </Block>
          )}
          <Block title="Review" i={8}><JevStatus compact /></Block>
          <Button onClick={onPitch} className="h-12 w-full bg-paper text-forest hover:bg-on-dark"><FileText aria-hidden="true" />Draft pitch notes</Button>
        </div>
      )}
    </aside>
  );
}

function Block({ title, children, i }: { title: string; children: React.ReactNode; i: number }) {
  return (
    <section className="rise border-t border-on-dark-line pt-4" style={{ "--i": i } as React.CSSProperties}>
      <h3 className="eyebrow mb-2">{title}</h3>
      {children}
    </section>
  );
}

function Pills({ items }: { items: string[] }) {
  return <div className="flex flex-wrap gap-2">{items.map((t, i) => <span key={t} className="pop rounded-full border border-on-dark-line bg-forest-2 px-3 py-1 text-xs font-semibold" style={{ "--i": i } as React.CSSProperties}>{t}</span>)}</div>;
}

function PitchSheet({ g, show }: { g: GreenRoom; show: UiShow }) {
  const text = g.pitchFor(show);
  const [copied, setCopied] = useState(false);
  return (
    <>
      <SheetHeader>
        <SheetTitle className="font-display text-3xl font-normal">Pitch Studio</SheetTitle>
        <SheetDescription>A starting point drafted only from Qloo evidence. Edit it, copy it, send it yourself.</SheetDescription>
      </SheetHeader>
      <div className="mt-6">
        <PitchEditor value={text} onChange={(t) => g.setPitch(show.id, t)} to={show.name} re={g.brief?.work ?? g.work} seed={show.id} />
        <Button className="mt-4" onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* blocked */ } }}>
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{copied ? "Copied" : "Copy pitch"}
        </Button>
      </div>
    </>
  );
}
