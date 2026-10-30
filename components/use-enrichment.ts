// use-enrichment.ts: optional per-show enrichment (shared themes, audience). Failure is a typed state, never a block.
"use client";

import { useEffect, useState } from "react";
import { adaptAngles, adaptAudience } from "@/lib/ui/adapt";
import type { Enrichment, UiAngle, UiAudience, UiShow } from "@/lib/ui/types";

export interface EnrichmentState {
  loading: boolean;
  audience: Enrichment<UiAudience> | null;
  angles: Enrichment<UiAngle[]> | null;
}

const IDLE: EnrichmentState = { loading: false, audience: null, angles: null };
const FAILED: Enrichment<never> = { state: "unavailable", reason: "request_failed" };

export function useEnrichment(show: UiShow | null, workId: string | null): EnrichmentState {
  const [st, setSt] = useState<EnrichmentState>(IDLE);
  useEffect(() => {
    if (!show || !workId) return setSt(IDLE);
    let cancelled = false;
    setSt({ loading: true, audience: null, angles: null });
    fetch(`/api/show?work=${encodeURIComponent(workId)}&show=${encodeURIComponent(show.id)}`)
      .then((r) => r.json())
      .then((j) => !cancelled && setSt({ loading: false, audience: adaptAudience(j.audience), angles: adaptAngles(j.angles) }))
      .catch(() => !cancelled && setSt({ loading: false, audience: FAILED, angles: FAILED }));
    return () => { cancelled = true; };
  }, [show?.id, workId]); // eslint-disable-line react-hooks/exhaustive-deps
  return st;
}

export const themesOf = (e: EnrichmentState): string[] => (e.angles?.state === "ok" ? e.angles.data.map((a) => a.tag) : []);
