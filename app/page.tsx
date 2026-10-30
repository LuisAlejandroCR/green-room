// page.tsx: the one screen: inputs, results list, show detail panel.
"use client";

import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ModeBadge, Notice, TierBadge } from "@/components/status";
import { ShowDetail } from "@/components/show-detail";
import { adaptRun } from "@/lib/ui/adapt";
import type { ReachTier, UiRun, UiShow } from "@/lib/ui/types";

const REACH: { value: ReachTier; label: string }[] = [
  { value: "reachable", label: "Reachable" },
  { value: "stretch", label: "Stretch" },
  { value: "dream", label: "Dream" },
];

export default function Home() {
  const [work, setWork] = useState("");
  const [seeds, setSeeds] = useState("");
  const [reach, setReach] = useState<ReachTier>("stretch");
  const [busy, setBusy] = useState(false);
  const [run, setRun] = useState<UiRun | null>(null);
  const [open, setOpen] = useState<UiShow | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setOpen(null);
    try {
      const r = await fetch("/api/run", {
        method: "POST",
        body: JSON.stringify({ work, seeds: seeds.split(",").map((s) => s.trim()).filter(Boolean), reach }),
      });
      setRun(adaptRun(await r.json()));
    } catch {
      setRun(adaptRun({ error: "network" }));
    }
    setBusy(false);
  }

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
        <fieldset>
          <legend className="text-sm font-bold">How big a show can you land?</legend>
          <div className="mt-1 flex gap-2">
            {REACH.map((r) => (
              <button key={r.value} type="button" aria-pressed={reach === r.value} onClick={() => setReach(r.value)}
                className={`min-h-11 flex-1 rounded-full border px-4 text-sm font-semibold ${reach === r.value ? "border-primary bg-primary text-primary-foreground" : "bg-background"}`}>
                {r.label}
              </button>
            ))}
          </div>
        </fieldset>
        <Button type="submit" size="lg" className="w-full" disabled={busy || !work.trim()}>
          {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Search aria-hidden="true" />}
          {busy ? "Asking Qloo which podcasts share this audience…" : "Build my booking list"}
        </Button>
      </form>

      <section aria-live="polite" className="mt-6 space-y-3">
        {busy && <><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></>}
        {!busy && run && (
          <>
            {run.mode && <ModeBadge mode={run.mode} />}
            {run.state === "unresolved" && <Notice>Qloo doesn&apos;t know: {run.unresolved.join(", ")}. Try another name.</Notice>}
            {run.state === "degraded" && <Notice>We couldn&apos;t reach Qloo just now. We won&apos;t guess.</Notice>}
            {run.state === "failed" && <Notice>Something went wrong. Nothing was invented. Try again.</Notice>}
            {run.state === "empty" && <Notice>Qloo found no podcasts for this mix. Try fewer seeds or a bigger show size.</Notice>}
            {run.state === "ok" && (
              <ul className="divide-y rounded-3xl border bg-card shadow-soft">
                {run.shows.map((s) => (
                  <li key={s.id}>
                    <button type="button" onClick={() => setOpen(s)} className="flex min-h-16 w-full items-center justify-between gap-3 px-4 py-3 text-left">
                      <span>
                        <span className="block font-bold">{s.name}</span>
                        <span className="text-sm text-muted-foreground">
                          Audience overlap {s.overlap.toFixed(2)}{s.tie ? " · within 0.05 of a neighbor: treat as a tie" : ""}
                        </span>
                      </span>
                      <TierBadge tier={s.tier} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">Qloo results describe aggregate audience affinities, not any individual&apos;s identity or behavior.</p>
          </>
        )}
      </section>

      <ShowDetail show={open} work={work} workId={run?.workId ?? null} mode={run?.mode ?? null} onClose={() => setOpen(null)} />
    </main>
  );
}
