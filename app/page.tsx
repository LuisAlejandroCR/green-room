// page.tsx: the listening-room shell. Desktop: dark nav + ivory workspace + dark evidence panel.
// Mobile: one decision per screen (Discover, Receipt, Pitch) with an icon-first bottom bar.
"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { ArrowLeft } from "lucide-react";
import { Art, LeafMark, RouteLines } from "@/components/art";
import { BriefForm, ConfirmStep, parseSeeds } from "@/components/brief-form";
import { EvidencePanel } from "@/components/evidence";
import { MatchRow, MatchTile } from "@/components/matches";
import { BottomNav, Sidebar, type View } from "@/components/nav";
import { PitchEditor } from "@/components/pitch";
import { LoadingRows, RunNotice } from "@/components/run-states";
import { ScoreRing } from "@/components/score-ring";
import { AFFINITY_SHORT, JevStatus, ModeBadge, POPULARITY_NOTE } from "@/components/status";
import { themesOf, useEnrichment } from "@/components/use-enrichment";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { adaptRun } from "@/lib/ui/adapt";
import { formatRetrieved } from "@/lib/ui/format";
import { draftPitch } from "@/lib/pitch";
import type { UiRun, UiShow } from "@/lib/ui/types";

const DESKTOP = "(min-width: 1024px)";
function useIsDesktop(): boolean {
  return useSyncExternalStore(
    (cb) => { const m = window.matchMedia(DESKTOP); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
    () => window.matchMedia(DESKTOP).matches,
    () => false,
  );
}

type Screen = "main" | "receipt" | "pitch";

export default function Home() {
  const desktop = useIsDesktop();
  const [work, setWork] = useState("");
  const [seeds, setSeeds] = useState("");
  const [busy, setBusy] = useState(false);
  const [run, setRun] = useState<UiRun | null>(null);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [view, setView] = useState<View>("discover");
  const [screen, setScreen] = useState<Screen>("main");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [pitch, setPitch] = useState<{ id: string; text: string } | null>(null);
  const [pitchOpen, setPitchOpen] = useState(false);
  // Demo is explicit and synthetic-only; the normal path remains live Qloo.
  const [demoRequested, setDemoRequested] = useState(false);

  const shows = useMemo(
    () => [...(run?.shows ?? [])].sort((a, b) => (b.overlap ?? -1) - (a.overlap ?? -1)),
    [run],
  );
  // Desktop always has an evidence panel, so it defaults to the top match; mobile only opens a receipt on tap.
  const selected = shows.find((s) => s.id === selectedId) ?? (desktop ? (shows[0] ?? null) : null);
  const enr = useEnrichment(selected, run?.workId ?? null);

  async function post(confirmed: Record<string, string>, demo = false) {
    setBusy(true);
    setSelectedId(null);
    setPitch(null);
    setScreen("main");
    setView("discover");
    try {
      const r = await fetch(demo ? "/api/demo" : "/api/run", { method: "POST", body: JSON.stringify({ work, seeds: parseSeeds(seeds), confirmed }) });
      setRun(adaptRun(await r.json()));
      setEditing(false);
    } catch {
      setRun(adaptRun({ error: "network" }));
    }
    setBusy(false);
  }
  const submit = () => { setChoices({}); setDemoRequested(false); void post({}); };
  const tryDemo = () => { setChoices({}); setDemoRequested(true); void post({}, true); };
  const confirm = () => run && void post({ ...Object.fromEntries(run.resolved.map((r) => [r.name, r.id])), ...choices }, demoRequested);
  const cancel = () => {
    setChoices({});
    setRun({ state: "cancelled", mode: null, workId: null, shows: [], resolved: [], candidates: [], unresolved: [], notFetched: [], ignoredSeeds: [], budget: null });
  };
  const openReceipt = (s: UiShow) => { setSelectedId(s.id); setPitch(null); setScreen("receipt"); };
  const openPitch = () => {
    if (!selected) return;
    setPitch((p) => (p?.id === selected.id ? p : { id: selected.id, text: draftPitch(work, selected.name, themesOf(enr)) }));
    if (desktop) setPitchOpen(true); else setScreen("pitch");
  };

  const form = (compact: boolean) => (
    <BriefForm work={work} seeds={seeds} setWork={setWork} setSeeds={setSeeds} busy={busy} onSubmit={submit} onDemo={tryDemo} compact={compact} />
  );
  const confirmStep = run?.state === "needs_confirmation" && !busy ? (
    <ConfirmStep groups={run.candidates} choices={choices} setChoice={(n, id) => setChoices((c) => ({ ...c, [n]: id }))} onConfirm={confirm} onCancel={cancel} />
  ) : null;
  const hasMatches = run?.state === "ok" && shows.length > 0;
  const notice = run && !busy && (run.state !== "ok" || run.ignoredSeeds.length > 0) && run.state !== "needs_confirmation" ? <RunNotice run={run} /> : null;

  // ---------- Desktop
  if (desktop) {
    const top = shows.slice(0, 3);
    const list = (items: UiShow[]) => (
      <ul className="space-y-3">{items.map((s) => <MatchRow key={s.id} show={s} selected={s.id === selected?.id} onOpen={() => setSelectedId(s.id)} />)}</ul>
    );
    return (
      <div className="on-dark relative min-h-screen overflow-hidden bg-forest px-8 py-8 text-on-dark">
        <RouteLines className="absolute right-0 top-0 w-[34rem] opacity-80" />
        <header className="relative mx-auto mb-5 flex max-w-[84rem] items-center gap-6">
          <LeafMark className="size-9 text-primary" />
          <p className="font-display text-4xl font-semibold">Green Room</p>
          <p className="border-l border-on-dark-line pl-6 text-xs uppercase tracking-[0.25em] text-on-dark-muted">Podcast outreach<br />for bright ideas</p>
        </header>
        <div className="relative mx-auto grid max-w-[84rem] grid-cols-[13rem_minmax(0,1fr)_21rem] overflow-hidden rounded-3xl border border-on-dark-line shadow-2xl">
          <Sidebar view={view} onChange={setView} />
          <main className="min-w-0 space-y-6 bg-background p-8 text-foreground">
            {view === "discover" && (
              <>
                <div>
                  <h1 className="font-display text-4xl font-semibold leading-tight">Find the conversation<br />your story deserves.</h1>
                  <p className="mt-2 text-muted-foreground">AI research. Human judgment. Evidence with every match.</p>
                </div>
                {form(false)}
                {confirmStep}
                <section aria-labelledby="top-matches" className="space-y-3" aria-live="polite">
                  <div className="flex items-baseline justify-between">
                    <h2 id="top-matches" className="font-display text-2xl font-semibold">Top podcast matches</h2>
                    {hasMatches && <span className="text-xs text-muted-foreground">Sorted by affinity</span>}
                  </div>
                  {busy && <LoadingRows />}
                  {!busy && !run && <p className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">Your matches appear here after you build a list.</p>}
                  {notice}
                  {hasMatches && !busy && (
                    <>
                      {run && <ModeBadge mode={run.mode ?? "sample"} />}
                      {list(top)}
                      {shows.length > 3 && <Button variant="link" onClick={() => setView("shortlists")}>View all {shows.length} matches</Button>}
                      {top.some((s) => s.popularity !== undefined) && <p className="text-xs text-muted-foreground">{POPULARITY_NOTE}</p>}
                    </>
                  )}
                </section>
              </>
            )}
            {view === "shortlists" && (
              <section aria-labelledby="sl" className="space-y-3">
                <h1 id="sl" className="font-display text-3xl font-semibold">Shortlists</h1>
                {hasMatches ? <>{run && <ModeBadge mode={run.mode ?? "sample"} />}{list(shows)}</> : <p className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">No matches yet. Build a list in Discover. Saving shortlists is not available yet.</p>}
              </section>
            )}
            {view === "receipts" && (
              <section aria-labelledby="rc" className="space-y-3">
                <h1 id="rc" className="font-display text-3xl font-semibold">Receipts</h1>
                {hasMatches ? (
                  <ul className="divide-y rounded-2xl border bg-card">
                    {shows.map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                        <span className="min-w-0"><span className="block truncate font-semibold">{s.name}</span><span className="block text-xs text-muted-foreground">{s.provenance.queryId} · {formatRetrieved(s.provenance.retrievedAt)}</span></span>
                        <ModeBadge mode={s.mode} short />
                        <Button variant="outline" size="sm" className="h-11" onClick={() => setSelectedId(s.id)}>Open</Button>
                      </li>
                    ))}
                  </ul>
                ) : <p className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">No receipts yet. Every match you build gets one.</p>}
              </section>
            )}
          </main>
          <EvidencePanel run={run} show={selected} enr={enr} onPitch={openPitch} />
        </div>

        <Sheet open={pitchOpen && !!selected && !!pitch} onOpenChange={setPitchOpen}>
          <SheetContent className="w-full overflow-y-auto bg-background sm:max-w-lg">
            <SheetHeader className="text-left">
              <SheetTitle className="font-display text-2xl font-semibold">Pitch notes</SheetTitle>
              <SheetDescription>{selected?.name}</SheetDescription>
            </SheetHeader>
            <div className="mt-4 pb-6">{pitch && <PitchEditor value={pitch.text} onChange={(text) => setPitch({ id: pitch.id, text })} />}</div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // ---------- Mobile
  const header = (title: string, back?: () => void) => (
    <header className="flex items-center gap-2 px-4 pb-2 pt-4">
      {back ? (
        <button type="button" onClick={back} aria-label="Back" className="grid size-11 place-items-center rounded-full"><ArrowLeft className="size-5" aria-hidden="true" /></button>
      ) : <LeafMark className="size-6 text-primary" />}
      <h1 className="font-display text-2xl font-semibold">{title}</h1>
    </header>
  );
  const top3 = shows.slice(0, 3);
  let body: React.ReactNode;

  if (screen === "pitch" && selected && pitch) {
    body = (
      <>
        {header("Pitch notes", () => setScreen("receipt"))}
        <div className="space-y-3 px-4">
          <div className="h-24 overflow-hidden rounded-2xl"><Art seed={selected.id} variant="leaf" /></div>
          <PitchEditor value={pitch.text} onChange={(text) => setPitch({ id: pitch.id, text })} />
        </div>
      </>
    );
  } else if (screen === "receipt" && selected) {
    const p = selected.provenance;
    const themes = enr.angles?.state === "ok" ? enr.angles.data.slice(0, 3) : [];
    body = (
      <>
        {header("Why this match", () => setScreen("main"))}
        <div className="space-y-3 px-4">
          <div className="flex items-center gap-3">
            <span className="size-16 shrink-0 overflow-hidden rounded-xl"><Art seed={selected.id} /></span>
            <p className="min-w-0 flex-1 font-display text-xl font-semibold leading-tight">{selected.name}</p>
            <ScoreRing value={selected.overlap} size={84} />
          </div>
          <section aria-label="Shared themes">
            {enr.loading && <Skeleton className="h-8 w-full" />}
            {!enr.loading && themes.length > 0 && <ul className="flex flex-wrap gap-2">{themes.map((t) => <li key={t.tag} className="rounded-full bg-secondary px-3 py-1.5 text-sm font-semibold">{t.tag}</li>)}</ul>}
            {!enr.loading && enr.angles && enr.angles.state !== "ok" && <p className="text-sm text-muted-foreground">Themes unavailable{enr.angles.state === "unavailable" ? ` (${enr.angles.reason})` : " (none returned)"}.</p>}
          </section>
          <dl className="divide-y rounded-2xl border bg-card text-sm">
            <div className="flex justify-between gap-3 p-3"><dt className="font-semibold">Source</dt><dd className="text-right text-muted-foreground">{p.source}</dd></div>
            <div className="flex justify-between gap-3 p-3"><dt className="font-semibold">Retrieved</dt><dd className="text-right text-muted-foreground"><time dateTime={p.retrievedAt}>{formatRetrieved(p.retrievedAt)}</time></dd></div>
            <div className="flex items-center justify-between gap-3 p-3"><dt className="font-semibold">Data</dt><dd><ModeBadge mode={selected.mode} short /></dd></div>
            {selected.popularity !== undefined && <div className="p-3"><div className="flex justify-between"><dt className="font-semibold">Qloo popularity index</dt><dd>{selected.popularity.toFixed(2)}</dd></div><p className="mt-1 text-xs text-muted-foreground">{POPULARITY_NOTE}</p></div>}
            <div className="p-3"><JevStatus compact /></div>
          </dl>
          <p className="text-xs text-muted-foreground">{AFFINITY_SHORT}</p>
          <Button size="lg" className="h-12 w-full" onClick={openPitch}>Draft pitch notes</Button>
        </div>
      </>
    );
  } else if (view === "receipts") {
    body = (
      <>
        {header("Receipts")}
        <div className="px-4">
          {hasMatches ? <ul className="space-y-2">{shows.map((s) => <MatchTile key={s.id} show={s} onOpen={() => openReceipt(s)} />)}</ul> : <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">No receipts yet.</p>}
        </div>
      </>
    );
  } else if (view === "shortlists") {
    body = (
      <>
        {header("Shortlists")}
        <div className="px-4">
          {hasMatches ? <ul className="space-y-2">{shows.map((s) => <MatchTile key={s.id} show={s} onOpen={() => openReceipt(s)} />)}</ul> : <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">No matches yet. Saving shortlists is not available yet.</p>}
        </div>
      </>
    );
  } else if (hasMatches && !busy && !editing) {
    body = (
      <>
        {header(`Your ${top3.length} ${top3.length === 1 ? "match" : "matches"}`)}
        <div className="space-y-3 px-4" aria-live="polite">
          <div className="h-28 overflow-hidden rounded-2xl"><Art seed={work || "campaign"} variant="landscape" /></div>
          {run && <ModeBadge mode={run.mode ?? "sample"} short />}
          <ul className="space-y-2">{top3.map((s) => <MatchTile key={s.id} show={s} onOpen={() => openReceipt(s)} />)}</ul>
          <Button variant="outline" className="h-11 w-full" onClick={() => setEditing(true)}>Edit brief</Button>
        </div>
      </>
    );
  } else {
    body = (
      <>
        {header("Green Room")}
        <div className="space-y-3 px-4" aria-live="polite">
          <p className="font-display text-xl leading-snug">Find the conversation your story deserves.</p>
          {form(true)}
          {confirmStep}
          {busy && <LoadingRows />}
          {notice}
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {body}
      <BottomNav view={view} onChange={(v) => { setView(v); setScreen("main"); }} />
    </div>
  );
}
