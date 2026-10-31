// tour.ts: the keyless RECORDED tour. One real demo run is captured from the live app in development and stored in a
// private server variable (GREEN_ROOM_TOUR, base64 JSON, e.g. a Vercel env var), never in the repo. It is served
// only when someone asks for the tour, always labelled RECORDED with its capture date, and never used when live fails.
import type { RunResponse } from "./run.ts";

export interface Tour {
  recordedAt: string;
  run: Omit<RunResponse, "mode"> & { mode: "recorded" };
}

export const tourPresent = () => Boolean(process.env.GREEN_ROOM_TOUR);

export function encodeTour(run: RunResponse, recordedAt = new Date().toISOString()): string {
  return Buffer.from(JSON.stringify({ recordedAt, run }), "utf8").toString("base64");
}

/** Decodes and relabels the stored run. Anything that does not parse is treated as absent, never repaired. */
export function readTour(raw: string | undefined = process.env.GREEN_ROOM_TOUR): Tour | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as { recordedAt?: unknown; run?: RunResponse };
    const run = parsed.run;
    if (typeof parsed.recordedAt !== "string" || !run || run.state !== "ok" || !Array.isArray(run.results) || !run.results.length) return null;
    const day = parsed.recordedAt.slice(0, 10);
    return {
      recordedAt: parsed.recordedAt,
      run: {
        ...run,
        mode: "recorded",
        results: run.results.map((r) => ({
          ...r,
          mode: "recorded" as never,
          provenance: { ...r.provenance, source: `RECORDED ${day} · ${r.provenance.source.replace(/^RECORDED \S+ · /, "")}` },
        })),
      },
    };
  } catch {
    return null;
  }
}
