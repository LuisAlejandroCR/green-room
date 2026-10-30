// evidence.tsx: the dark "Proof, not promise." panel (desktop). Every value comes from the selected result's
// provenance or the optional enrichment; anything absent is rendered as unavailable.
import { Calendar, FileText, Hash, Leaf, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AFFINITY_NOTE, JevStatus, ModeBadge, POPULARITY_NOTE } from "./status";
import type { EnrichmentState } from "./use-enrichment";
import { formatRetrieved } from "@/lib/ui/format";
import type { UiRun, UiShow } from "@/lib/ui/types";

function Row({ Icon, title, children }: { Icon: typeof Leaf; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 border-t border-on-dark-line py-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-on-dark-muted" aria-hidden="true" />
      <div className="min-w-0 text-sm">
        <p className="font-semibold">{title}</p>
        <div className="mt-0.5 break-words text-xs text-on-dark-muted">{children}</div>
      </div>
    </div>
  );
}

export function EvidencePanel({ run, show, enr, onPitch }: { run: UiRun | null; show: UiShow | null; enr: EnrichmentState; onPitch: () => void }) {
  const p = show?.provenance;
  const themes = enr.angles?.state === "ok" ? enr.angles.data.slice(0, 3) : [];
  return (
    <aside aria-label="Evidence" className="on-dark relative overflow-hidden bg-panel p-6 text-on-dark">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-dark-muted">Evidence</p>
      <h2 className="mt-2 font-display text-3xl font-semibold leading-tight">Proof, not promise.</h2>
      <p className="mt-2 text-sm text-on-dark-muted">See exactly why a podcast matches, with the source and time of every value.</p>

      {!show || !p ? (
        <p className="mt-6 border-t border-on-dark-line pt-4 text-sm text-on-dark-muted">
          {run?.state === "ok" ? "Open a receipt to see its evidence." : "Evidence appears here once you have matches."}
        </p>
      ) : (
        <div className="mt-5">
          <p className="font-display text-xl font-semibold">{show.name}</p>
          <div className="mt-2"><ModeBadge mode={show.mode} /></div>

          <div className="mt-3">
            <Row Icon={Leaf} title="Shared themes">
              {enr.loading && <Skeleton className="h-6 w-full bg-on-dark-line" />}
              {!enr.loading && enr.angles?.state === "ok" && (
                <ul className="flex flex-wrap gap-1.5">{themes.map((t) => <li key={t.tag} className="rounded-full bg-on-dark-line px-2.5 py-1 text-on-dark">{t.tag}</li>)}</ul>
              )}
              {!enr.loading && enr.angles?.state === "empty" && "None returned by Qloo for this pair."}
              {!enr.loading && enr.angles?.state === "unavailable" && `Unavailable (${enr.angles.reason}).`}
            </Row>
            <Row Icon={FileText} title="Source">{p.source}</Row>
            <Row Icon={Calendar} title="Retrieved"><time dateTime={p.retrievedAt}>{formatRetrieved(p.retrievedAt)}</time></Row>
            <Row Icon={Hash} title="Receipt">Query {p.queryId} · Entity {p.entityId}</Row>
            <Row Icon={Users} title="Affinity">
              {p.affinity !== undefined ? p.affinity.toFixed(2) : "Unavailable"}
              {p.popularity !== undefined && <><br />Qloo popularity index {p.popularity.toFixed(2)}<br />{POPULARITY_NOTE}</>}
            </Row>
            {enr.audience?.state === "ok" && (
              <Row Icon={Users} title="Audience (optional)">
                {[...enr.audience.data.age.slice(0, 1), ...enr.audience.data.gender.slice(0, 1)].map((r) => `${r.label} ${r.share.toFixed(2)}`).join(" · ")}
              </Row>
            )}
          </div>

          <div className="border-t border-on-dark-line py-3"><JevStatus dark /></div>
          <Button variant="outline" className="mt-1 w-full border-on-dark/40 bg-transparent text-on-dark hover:bg-on-dark-line" onClick={onPitch}>Draft pitch notes</Button>
        </div>
      )}

      <p className="mt-5 border-t border-on-dark-line pt-3 text-xs text-on-dark-muted">{AFFINITY_NOTE}</p>
      {run?.budget && <p className="mt-2 text-xs text-on-dark-muted">Qloo requests this run: {run.budget.used} of {run.budget.max}.</p>}
    </aside>
  );
}
