// page.tsx: the one screen: inputs, entity confirmation, results list, show detail panel.
"use client";

import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ModeBadge, Notice, POPULARITY_NOTE } from "@/components/status";
import { ShowDetail } from "@/components/show-detail";
import { adaptRun } from "@/lib/ui/adapt";
import type { UiRun, UiShow } from "@/lib/ui/types";

export default function Home() {
  const [work, setWork] = useState("");
  const [seeds, setSeeds] = useState("");
  const [busy, setBusy] = useState(false);
  const [run, setRun] = useState<UiRun | null>(null);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<UiShow | null>(null);

  const seedList = () => seeds.split(",").map((s) => s.trim()).filter(Boolean);

  async function post(confirmed: Record<string, string>) {
    setBusy(true);
    setOpen(null);
    try {
      const r = await fetch("/api/run", { method: "POST", body: JSON.stringify({ work, seeds: seedList(), confirmed }) });
      setRun(adaptRun(await r.json()));
    } catch {
      setRun(adaptRun({ error: "network" }));
    }
    setBusy(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setChoices({});
    void post({});
  }

  function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!run) return;
    const known = Object.fromEntries(run.resolved.map((r) => [r.name, r.id]));
    void post({ ...known, ...choices });
  }

  function cancel() {
    setChoices({});
    setRun({ state: "cancelled", mode: null, workId: null, shows: [], resolved: [], candidates: [], unresolved: [], notFetched: [], budget: null });
  }

  const pending = run?.state === "needs_confirmation" ? run.candidates : [];
  const ready = pending.length > 0 && pending.every((g) => choices[g.name]);
  const anyPopularity = run?.shows.some((s) => s.popularity !== undefined) ?? false;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-extrabold tracking-tight">Green Room</h1>
      <p className="mt-1 text-muted-foreground">Find the podcasts whose listeners already love your guest&apos;s work.</p>

      <form onSubmit={submit} className="mt-6 space-y-4 rounded-3xl border bg-card p-5 shadow-soft">
        <div>
          <label htmlFor="work" className="text-sm font-bold">Your guest&apos;s work</label>
          <p id="work-hint" className="text-xs text-muted-foreground">A book, brand, film or album. We&apos;ll ask if there&apos;s more than one match.</p>
          <Input id="work" aria-describedby="work-hint" value={work} onChange={(e) => setWork(e.target.value)} className="mt-1 h-11 rounded-full px-4" />
        </div>
        <div>
          <label htmlFor="seeds" className="text-sm font-bold">Who should hear it?</label>
          <p id="seeds-hint" className="text-xs text-muted-foreground">Up to 3 things your ideal listener already loves, comma-separated. No personal data needed.</p>
          <Input id="seeds" aria-describedby="seeds-hint" value={seeds} onChange={(e) => setSeeds(e.target.value)} className="mt-1 h-11 rounded-full px-4" />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={busy || !work.trim()}>
          {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Search aria-hidden="true" />}
          {busy ? "Asking Qloo…" : "Build my booking list"}
        </Button>
      </form>

      <section aria-live="polite" className="mt-6 space-y-3">
        {busy && <><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></>}
        {!busy && run && (
          <>
            {run.mode && run.state !== "cancelled" && <ModeBadge mode={run.mode} />}

            {run.state === "needs_confirmation" && (
              <form onSubmit={confirm} className="space-y-4 rounded-3xl border-2 border-amber/60 bg-card p-5">
                <h2 className="font-bold">Confirm what you meant</h2>
                <p className="text-sm text-muted-foreground">More than one match came back. Nothing is recommended until you choose.</p>
                {pending.map((g) => (
                  <fieldset key={g.name}>
                    <legend className="text-sm font-bold">“{g.name}”</legend>
                    <div className="mt-1 space-y-1">
                      {g.options.map((o) => (
                        <label key={o.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border bg-background px-3 text-sm">
                          <input type="radio" name={`pick-${g.name}`} value={o.id} checked={choices[g.name] === o.id}
                            onChange={() => setChoices((c) => ({ ...c, [g.name]: o.id }))} className="size-4" />
                          {o.name}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={cancel}>Cancel</Button>
                  <Button type="submit" className="flex-1" disabled={!ready}>Confirm and build list</Button>
                </div>
              </form>
            )}

            {run.state === "cancelled" && <Notice>Search cancelled. Nothing was recommended.</Notice>}
            {run.state === "unresolved" && <Notice>Qloo doesn&apos;t know: {run.unresolved.join(", ")}. Try another name.</Notice>}
            {run.state === "degraded" && <Notice>We couldn&apos;t get a usable answer from Qloo ({run.note ?? "unavailable"}). We won&apos;t guess.</Notice>}
            {run.state === "malformed" && <Notice>Qloo or the server returned data we couldn&apos;t read, so nothing is shown.</Notice>}
            {run.state === "failed" && <Notice>Something went wrong reaching the server. Nothing was invented. Try again.</Notice>}
            {run.state === "empty" && <Notice>Qloo found no podcasts for this mix. Try fewer or different seeds.</Notice>}
            {run.state === "partial" && (
              <Notice>
                Partial result: the {run.budget?.max ?? 8}-request budget ran out. Not fetched: {run.notFetched.join("; ")}.
              </Notice>
            )}

            {run.state === "ok" && (
              <>
                <ul className="divide-y rounded-3xl border bg-card shadow-soft">
                  {run.shows.map((s) => (
                    <li key={s.id}>
                      <button type="button" onClick={() => setOpen(s)} className="flex min-h-16 w-full items-center justify-between gap-3 px-4 py-3 text-left">
                        <span>
                          <span className="block font-bold">{s.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {s.overlap !== undefined ? `Audience overlap ${s.overlap.toFixed(2)}` : "No affinity returned"}
                            {s.popularity !== undefined ? ` · Qloo popularity index ${s.popularity.toFixed(2)}` : ""}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                {anyPopularity && <p className="text-xs text-muted-foreground">{POPULARITY_NOTE}</p>}
              </>
            )}
            <p className="text-xs text-muted-foreground">Qloo results describe aggregate audience affinities, not any individual&apos;s identity or behavior.</p>
          </>
        )}
      </section>

      <ShowDetail show={open} work={work} workId={run?.workId ?? null} onClose={() => setOpen(null)} />
    </main>
  );
}
