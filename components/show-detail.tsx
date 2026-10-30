// show-detail.tsx: side panel for one show: receipt, optional audience and angles, and a pitch draft you edit.
// Enrichment is optional: if it fails the receipt and the pitch draft stay available. Green Room never sends email.
"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ModeBadge, Notice, POPULARITY_NOTE } from "./status";
import { adaptAngles, adaptAudience } from "@/lib/ui/adapt";
import { draftPitch } from "@/lib/pitch";
import type { Enrichment, UiAngle, UiAudience, UiShow } from "@/lib/ui/types";

const UNAVAILABLE: Enrichment<never> = { state: "unavailable", reason: "request_failed" };

export function ShowDetail({ show, work, workId, onClose }: {
  show: UiShow | null;
  work: string;
  workId: string | null;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [audience, setAudience] = useState<Enrichment<UiAudience> | null>(null);
  const [angles, setAngles] = useState<Enrichment<UiAngle[]> | null>(null);
  const [pitch, setPitch] = useState<string | null>(null);

  useEffect(() => {
    setAudience(null);
    setAngles(null);
    setPitch(null);
    if (!show || !workId) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/show?work=${encodeURIComponent(workId)}&show=${encodeURIComponent(show.id)}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        setAudience(adaptAudience(j.audience));
        setAngles(adaptAngles(j.angles));
      })
      .catch(() => {
        if (cancelled) return;
        setAudience(UNAVAILABLE);
        setAngles(UNAVAILABLE);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [show, workId]);

  const tags = angles?.state === "ok" ? angles.data.map((a) => a.tag) : [];
  const p = show?.provenance;

  return (
    <Sheet open={!!show} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto bg-background sm:max-w-lg">
        {show && p && (
          <>
            <SheetHeader className="text-left">
              <div className="flex flex-wrap items-center gap-2">
                <ModeBadge mode={show.mode} />
              </div>
              <SheetTitle className="text-2xl font-extrabold">{show.name}</SheetTitle>
              <SheetDescription>
                {show.overlap !== undefined
                  ? `Audience overlap ${show.overlap.toFixed(2)}. Qloo affinity for everything you entered, taken together. Not a probability.`
                  : "Qloo returned no affinity value for this show."}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-5 pb-6">
              {show.popularity !== undefined && (
                <section className="rounded-2xl border bg-card p-4">
                  <h3 className="font-bold">Qloo popularity index: {show.popularity.toFixed(2)}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{POPULARITY_NOTE}</p>
                </section>
              )}

              <section aria-labelledby="receipt" className="rounded-2xl border bg-card p-4">
                <h3 id="receipt" className="font-bold">Receipt</h3>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 break-all text-xs">
                  <dt className="font-semibold">Source</dt><dd>{p.source}</dd>
                  <dt className="font-semibold">Query</dt><dd>{p.queryId}</dd>
                  <dt className="font-semibold">Entity</dt><dd>{p.entityId}</dd>
                  <dt className="font-semibold">Retrieved</dt><dd><time dateTime={p.retrievedAt}>{p.retrievedAt}</time></dd>
                  {p.affinity !== undefined && (<><dt className="font-semibold">Affinity</dt><dd>{p.affinity}</dd></>)}
                  {p.explanation && (<><dt className="font-semibold">Why</dt><dd>{p.explanation}</dd></>)}
                </dl>
              </section>

              {loading && <Skeleton className="h-24 w-full" />}

              {!loading && audience && (
                <section className="rounded-2xl border bg-card p-4">
                  <h3 className="font-bold">Who listens <span className="text-xs font-normal text-muted-foreground">(optional)</span></h3>
                  {audience.state === "ok" && (
                    <dl className="mt-2 space-y-1 text-sm">
                      {[...audience.data.age.slice(0, 2), ...audience.data.gender.slice(0, 2)].map((r) => (
                        <div key={r.label} className="flex justify-between"><dt>{r.label}</dt><dd className="font-semibold">{r.share.toFixed(2)}</dd></div>
                      ))}
                    </dl>
                  )}
                  {audience.state === "empty" && <p className="mt-1 text-sm text-muted-foreground">Qloo returned no audience breakdown for this show.</p>}
                  {audience.state === "unavailable" && <Notice>Audience details are unavailable ({audience.reason}). The shortlist and pitch draft still work.</Notice>}
                </section>
              )}

              {!loading && angles && (
                <section className="rounded-2xl border bg-card p-4">
                  <h3 className="font-bold">Shared angles <span className="text-xs font-normal text-muted-foreground">(optional)</span></h3>
                  {angles.state === "ok" && (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {angles.data.map((a) => <li key={a.tag} className="rounded-full bg-secondary px-3 py-1 text-sm font-semibold">{a.tag}</li>)}
                    </ul>
                  )}
                  {angles.state === "empty" && <p className="mt-1 text-sm text-muted-foreground">Qloo returned no shared tags for this pair.</p>}
                  {angles.state === "unavailable" && <Notice>Shared angles are unavailable ({angles.reason}). The pitch draft will not mention any.</Notice>}
                </section>
              )}

              {!pitch ? (
                <Button size="lg" className="w-full" disabled={loading} onClick={() => setPitch(draftPitch(work, show.name, tags))}>
                  Draft pitch
                </Button>
              ) : (
                <section className="rounded-2xl border-2 border-amber/60 bg-card p-4">
                  <label htmlFor="pitch" className="font-bold">Pitch draft</label>
                  <textarea id="pitch" value={pitch} onChange={(e) => setPitch(e.target.value)} rows={10} className="mt-2 w-full rounded-xl border border-input bg-background p-3 text-sm" />
                  <p className="mt-2 text-xs text-muted-foreground">Draft only. Edit before you send. Green Room never sends email. Built only from your guest&apos;s work and the angles Qloo returned for this show.</p>
                </section>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
