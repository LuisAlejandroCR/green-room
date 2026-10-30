// show-detail.tsx: side panel for one show: who listens, shared angles, and a pitch draft you edit.
// Draft only: Green Room never sends email.
"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ModeBadge, Notice, TierBadge } from "./status";
import { adaptAngles, adaptAudience } from "@/lib/ui/adapt";
import { draftPitch } from "@/lib/pitch";
import type { Mode, UiAngle, UiAudience, UiShow } from "@/lib/ui/types";

export function ShowDetail({ show, work, workId, mode, onClose }: {
  show: UiShow | null;
  work: string;
  workId: string | null;
  mode: Mode | null;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [audience, setAudience] = useState<UiAudience | null>(null);
  const [angles, setAngles] = useState<UiAngle[]>([]);
  const [pitch, setPitch] = useState<string | null>(null);

  useEffect(() => {
    setAudience(null);
    setAngles([]);
    setPitch(null);
    setFailed(false);
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
      .catch(() => !cancelled && setFailed(true))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [show, workId]);

  return (
    <Sheet open={!!show} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto bg-background sm:max-w-lg">
        {show && (
          <>
            <SheetHeader className="text-left">
              <div className="flex flex-wrap items-center gap-2">
                {mode && <ModeBadge mode={mode} />}
                <TierBadge tier={show.tier} />
              </div>
              <SheetTitle className="text-2xl font-extrabold">{show.name}</SheetTitle>
              <SheetDescription>
                Audience overlap {show.overlap.toFixed(2)}. Qloo affinity for everything you entered, taken together. Not a probability.
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-5 pb-6">
              {loading && <Skeleton className="h-24 w-full" />}
              {failed && <Notice>We couldn&apos;t load audience details just now. We won&apos;t guess.</Notice>}

              {!loading && !failed && (
                <section className="rounded-2xl border bg-card p-4">
                  <h3 className="font-bold">Who listens</h3>
                  {audience ? (
                    <dl className="mt-2 space-y-1 text-sm">
                      {[...audience.age.slice(0, 2), ...audience.gender.slice(0, 2)].map((r) => (
                        <div key={r.label} className="flex justify-between"><dt>{r.label}</dt><dd className="font-semibold">{r.share.toFixed(2)}</dd></div>
                      ))}
                    </dl>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">Qloo returned no audience breakdown for this show.</p>
                  )}
                </section>
              )}

              {!loading && !failed && (
                <section className="rounded-2xl border bg-card p-4">
                  <h3 className="font-bold">Shared angles</h3>
                  {angles.length ? (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {angles.map((a) => <li key={a.tag} className="rounded-full bg-secondary px-3 py-1 text-sm font-semibold">{a.tag}</li>)}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">Qloo returned no shared tags for this pair.</p>
                  )}
                </section>
              )}

              {!pitch ? (
                <Button size="lg" className="w-full" disabled={loading || failed} onClick={() => setPitch(draftPitch(work, show.name, angles.map((a) => a.tag)))}>
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
