// Deterministic fixtures for the explicit demo action. This module never contacts Qloo.
import { SAMPLE_PODCASTS, sampleSearch } from "./samples.ts";
import type { RunResponse } from "./run.ts";

export interface DemoInput { work: string; seeds: string[]; confirmed: Record<string, string>; }

const RETRIEVED_AT = "2026-10-31T00:00:00.000Z";
const QUERY_ID = "demo_fixture_v1";

export function executeDemo(input: DemoInput): RunResponse {
  const names = [input.work, ...input.seeds.filter((seed) => seed !== input.work)];
  const candidates = names.flatMap((name) => input.confirmed[name] ? [] : sampleSearch(name).length > 1
    ? [{ name, options: sampleSearch(name) }]
    : []);
  const base = {
    mode: "sample" as const, workId: null, resolved: names.map((name) => ({ name, id: input.confirmed[name] ?? sampleSearch(name)[0].id })),
    candidates, unresolved: [], notFetched: [], ignoredSeeds: [], budget: { used: 0, max: 8 },
  };
  if (candidates.length) return { ...base, state: "needs_confirmation", results: [] };
  return {
    ...base, state: "ok",
    results: SAMPLE_PODCASTS.map((show) => ({
      id: show.id, name: show.name, description: show.description, mode: "sample" as const,
      provenance: {
        entityId: show.id, queryId: QUERY_ID, source: "Synthetic demo fixture · no Qloo request",
        retrievedAt: RETRIEVED_AT, affinity: show.affinity, ...(show.popularity === undefined ? {} : { popularity: show.popularity }),
      },
    })),
  };
}
