// run.ts: one run = resolve names -> (confirm if ambiguous) -> recommend. Budget is request-scoped.
// Only confirmed or unambiguous entity IDs reach the recommendation call.
import {
  createBudget,
  currentMode,
  recommendPodcasts,
  searchEntity,
  type Budget,
  type Candidate,
  type PodcastResult,
  type QlooMode,
} from "./qloo.ts";

export interface RunInput {
  work: string;
  seeds: string[];
  confirmed: Record<string, string>; // typed name -> entity id the user picked
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
    budget: { used: 0, max: budget.max },
  };
  const finish = (patch: Partial<RunResponse>): RunResponse => ({
    ...out,
    ...patch,
    budget: { used: budget.used, max: budget.max },
  });

  for (const [i, name] of names.entries()) {
    const picked = input.confirmed[name];
    if (validId(picked)) {
      out.resolved.push({ name, id: picked });
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

  if (out.unresolved.length) return finish({ state: "unresolved" });
  if (out.candidates.length) return finish({ state: "needs_confirmation" });

  const ids = names.map((n) => out.resolved.find((r) => r.name === n)!.id);
  const rec = await recommendPodcasts({ seedEntityIds: ids }, budget);
  out.workId = ids[0];
  if (rec.status === "budget_exhausted") return finish({ state: "partial", error: rec.error, notFetched: ["recommendations"] });
  if (rec.status === "degraded" || rec.status === "malformed") return finish({ state: rec.status, mode: rec.mode, error: rec.error });
  if (rec.status === "empty" || !rec.data?.length) return finish({ state: "empty", mode: rec.mode });
  return finish({ state: "ok", mode: rec.mode, results: rec.data });
}
