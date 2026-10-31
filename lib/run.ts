// run.ts: one run = resolve names -> (confirm if ambiguous) -> recommend. Budget is request-scoped.
// Only confirmed or unambiguous entity IDs reach the recommendation call, and IDs confirmed in the browser are
// re-verified on the server with Qloo /entities before they are used.
import {
  createBudget,
  currentMode,
  entitiesById,
  recommendPodcasts,
  searchEntity,
  tasteOf,
  type Budget,
  type Candidate,
  type PodcastResult,
  type QlooMode,
} from "./qloo.ts";

export interface RunInput {
  work: string;
  seeds: string[];
  confirmed: Record<string, string>; // typed name -> entity id the user picked
  tags?: string[]; // optional Qloo tag ids used as an extra signal (suggested chips, "more like this")
}

export type RunState =
  | "ok"
  | "needs_confirmation"
  | "unresolved"
  | "empty"
  | "partial"
  | "degraded"
  | "malformed";

export interface RunResponse {
  state: RunState;
  mode: QlooMode;
  workId: string | null;
  results: PodcastResult[];
  resolved: { name: string; id: string }[];
  candidates: { name: string; options: Candidate[] }[];
  unresolved: string[];
  notFetched: string[];
  ignoredSeeds: string[]; // names Qloo could not use as a signal; they did not shape the results
  influence: { name: string; score: number }[]; // typed picks by their effect on the top results, highest first
  seedIds: string[]; // the verified entity ids that shaped the list, same order as the names (work first)
  taste: { id: string; name: string; score: number }[]; // taste analysis of the work; optional, empty when unavailable
  tags: string[]; // tag ids sent as a signal
  error?: string;
  budget: { used: number; max: number };
}

const SEARCH_TYPES = "urn:entity:book,urn:entity:brand,urn:entity:movie,urn:entity:artist"; // unverified for /search

export const validId = (v: unknown): v is string => typeof v === "string" && /^[\w:.-]{1,120}$/.test(v);

export async function executeRun(input: RunInput, budget: Budget = createBudget()): Promise<RunResponse> {
  const names = [input.work, ...input.seeds.filter((s) => s !== input.work)];
  const out: RunResponse = {
    state: "ok",
    mode: currentMode(),
    workId: null,
    results: [],
    resolved: [],
    candidates: [],
    unresolved: [],
    notFetched: [],
    ignoredSeeds: [],
    influence: [],
    seedIds: [],
    taste: [],
    tags: (input.tags ?? []).filter(validId).slice(0, 3),
    budget: { used: 0, max: budget.max },
  };
  const finish = (patch: Partial<RunResponse>): RunResponse => ({
    ...out,
    ...patch,
    budget: { used: budget.used, max: budget.max },
  });

  // One /entities request re-verifies every ID the browser sent back. An ID Qloo does not return is never used.
  const confirmedNames = names.filter((n) => validId(input.confirmed[n]));
  const verified = new Set<string>();
  if (confirmedNames.length) {
    const env = await entitiesById(confirmedNames.map((n) => input.confirmed[n]), budget);
    if (env.status === "budget_exhausted") return finish({ state: "partial", error: env.error, notFetched: ["id verification", "recommendations"] });
    if (env.status === "degraded" || env.status === "malformed") return finish({ state: env.status, mode: env.mode, error: env.error });
    for (const e of env.data ?? []) verified.add(e.id);
  }

  for (const [i, name] of names.entries()) {
    const picked = input.confirmed[name];
    if (validId(picked)) {
      if (verified.has(picked)) out.resolved.push({ name, id: picked });
      else out.unresolved.push(name);
      continue;
    }
    const env = await searchEntity(name, SEARCH_TYPES, budget);
    if (env.status === "budget_exhausted") {
      return finish({
        state: "partial",
        error: env.error,
        notFetched: [...names.slice(i).map((n) => `search: ${n}`), "recommendations"],
      });
    }
    if (env.status === "degraded" || env.status === "malformed") {
      return finish({ state: env.status, mode: env.mode, error: env.error });
    }
    if (!env.data?.length) out.unresolved.push(name);
    else if (env.data.length === 1) out.resolved.push({ name, id: env.data[0].id });
    else out.candidates.push({ name, options: env.data });
  }

  if (out.unresolved.length) return finish({ state: "unresolved", ...(confirmedNames.some((n) => out.unresolved.includes(n)) && { error: "confirmed_id_not_verified" }) });
  if (out.candidates.length) return finish({ state: "needs_confirmation" });

  const ids = names.map((n) => out.resolved.find((r) => r.name === n)!.id);
  const rec = await recommendPodcasts({ seedEntityIds: ids, ...(out.tags.length && { tagIds: out.tags }) }, budget);
  out.workId = ids[0];
  if (rec.status === "budget_exhausted") return finish({ state: "partial", error: rec.error, notFetched: ["recommendations"] });
  if (rec.status === "degraded" || rec.status === "malformed") return finish({ state: rec.status, mode: rec.mode, error: rec.error });
  if (rec.status === "empty" || !rec.data?.length) return finish({ state: "empty", mode: rec.mode });
  const ignoredSeeds = names.filter((_, i) => rec.ignoredSeedIds.includes(ids[i]));
  const influence = rec.influence.flatMap((r) => {
    const i = ids.indexOf(r.id);
    return i >= 0 ? [{ name: names[i], score: r.score }] : [];
  });
  const workUsable = !ignoredSeeds.includes(names[0]);
  // Taste analysis of the work: optional, one request, skipped when the budget is spent; its failure changes nothing else.
  const taste = workUsable && budget.used < budget.max ? await tasteOf(ids[0], budget) : null;
  // If the work itself was unusable, comparing against it returns an empty 200 that would read as "no shared angles".
  return finish({
    state: "ok", mode: rec.mode, results: rec.data, ignoredSeeds, influence, seedIds: ids,
    taste: taste?.status === "ok" ? (taste.data ?? []) : [],
    workId: workUsable ? ids[0] : null,
  });
}
