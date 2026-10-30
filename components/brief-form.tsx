// brief-form.tsx: the campaign brief (work + up to 3 listener interests) and the entity confirmation step.
"use client";

import { Loader2, Search } from "lucide-react";
import { Art } from "./art";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { UiCandidateGroup } from "@/lib/ui/types";
import { cn } from "@/lib/utils";

export function parseSeeds(raw: string): string[] {
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export function BriefForm({ work, seeds, setWork, setSeeds, busy, onSubmit, compact }: {
  work: string; seeds: string; setWork: (v: string) => void; setSeeds: (v: string) => void;
  busy: boolean; onSubmit: () => void; compact?: boolean;
}) {
  const chips = parseSeeds(seeds);
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className={cn("overflow-hidden rounded-3xl border bg-card shadow-soft", compact ? "" : "grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)]")}>
      <div className={cn("relative", compact ? "h-28" : "min-h-56")}><Art seed={work || "campaign"} variant="landscape" /></div>
      <div className="space-y-3 p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Your campaign</p>
        <div>
          <label htmlFor="work" className="text-sm font-bold">Your guest&apos;s work</label>
          <p id="work-hint" className="text-xs text-muted-foreground">A book, brand, film or album. We ask if there is more than one match.</p>
          <Input id="work" aria-describedby="work-hint" value={work} onChange={(e) => setWork(e.target.value)} className="mt-1 h-11 rounded-xl px-3 font-display text-lg" />
        </div>
        <div>
          <label htmlFor="seeds" className="text-sm font-bold">Who should hear it?</label>
          <p id="seeds-hint" className="text-xs text-muted-foreground">Up to 3 things your ideal listener loves, comma-separated. No personal data.</p>
          <Input id="seeds" aria-describedby="seeds-hint" value={seeds} onChange={(e) => setSeeds(e.target.value)} className="mt-1 h-11 rounded-xl px-3" />
          {chips.length > 0 && (
            <ul aria-label="Topics used" className="mt-2 flex flex-wrap gap-1.5">
              {chips.slice(0, 3).map((c) => <li key={c} className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">{c}</li>)}
              {chips.length > 3 && <li className="px-1 py-1 text-xs text-muted-foreground">Only the first 3 are used.</li>}
            </ul>
          )}
        </div>
        <Button type="submit" size="lg" className="h-12 w-full" disabled={busy || !work.trim()}>
          {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Search aria-hidden="true" />}
          {busy ? "Asking Qloo…" : "Build my booking list"}
        </Button>
      </div>
    </form>
  );
}

export function ConfirmStep({ groups, choices, setChoice, onConfirm, onCancel }: {
  groups: UiCandidateGroup[]; choices: Record<string, string>; setChoice: (name: string, id: string) => void;
  onConfirm: () => void; onCancel: () => void;
}) {
  const ready = groups.every((g) => choices[g.name]);
  return (
    <form onSubmit={(e) => { e.preventDefault(); onConfirm(); }} className="space-y-4 rounded-3xl border-2 border-amber/70 bg-card p-5">
      <h2 className="font-display text-xl font-semibold">Confirm what you meant</h2>
      <p className="text-sm text-muted-foreground">More than one match came back. Nothing is recommended until you choose.</p>
      {groups.map((g) => (
        <fieldset key={g.name}>
          <legend className="text-sm font-bold">“{g.name}”</legend>
          <div className="mt-1 space-y-1">
            {g.options.map((o) => (
              <label key={o.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border bg-background px-3 text-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-primary">
                <input type="radio" name={`pick-${g.name}`} value={o.id} checked={choices[g.name] === o.id} onChange={() => setChoice(g.name, o.id)} className="size-4" />
                {o.name}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="h-11 flex-1" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="h-11 flex-1" disabled={!ready}>Confirm and build list</Button>
      </div>
    </form>
  );
}
