// adapt.ts: maps /api/run and /api/show responses to what the screens render. Pure and defensive:
// anything not in the expected shape becomes an explicit "malformed" state, never a guessed value.
import type {
  Enrichment,
  Mode,
  RunUiState,
  UiAngle,
  UiAudience,
  UiProvenance,
  UiRun,
  UiShow,
} from "./types.ts";

const isRecord = (v: unknown): v is Record<string, any> => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const str = (v: unknown): string | undefined => (typeof v === "string" && v.length > 0 ? v : undefined);
const MODES: Mode[] = ["live", "recorded", "sample"];
const STATES: RunUiState[] = ["ok", "partial", "empty", "unresolved", "needs_confirmation", "degraded", "malformed", "rate_limited"];

function adaptProvenance(p: unknown): UiProvenance | null {
  if (!isRecord(p)) return null;
  const entityId = str(p.entityId);
  const queryId = str(p.queryId);
  const source = str(p.source);
  const retrievedAt = str(p.retrievedAt);
  if (!entityId || !queryId || !source || !retrievedAt) return null;
  const affinity = num(p.affinity);
  const popularity = num(p.popularity);
  const explanation = str(p.explanation);
  return {
    entityId, queryId, source, retrievedAt,
    ...(affinity !== undefined && { affinity }),
    ...(popularity !== undefined && { popularity }),
    ...(explanation !== undefined && { explanation }),
  };
}

function adaptShow(r: unknown): UiShow | null {
  if (!isRecord(r)) return null;
  const id = str(r.id);
  const name = str(r.name);
  const mode = MODES.find((m) => m === r.mode);
  const provenance = adaptProvenance(r.provenance);
  if (!id || !name || !mode || !provenance) return null; // a result without provenance is never displayed
  const description = str(r.description);
  return { id, name, ...(description !== undefined && { description }), mode, overlap: provenance.affinity, popularity: provenance.popularity, provenance };
}

export function adaptRun(raw: unknown): UiRun {
  const empty: UiRun = {
    state: "malformed", mode: null, workId: null, shows: [], resolved: [], candidates: [],
    unresolved: [], notFetched: [], budget: null,
  };
  if (!isRecord(raw)) return empty;
  if (raw.error && !raw.state) return { ...empty, state: "failed", note: str(raw.error) };
  const state = STATES.find((s) => s === raw.state);
  if (!state) return empty;
  const mode = MODES.find((m) => m === raw.mode) ?? null;
  const shows = (Array.isArray(raw.results) ? raw.results : []).map(adaptShow);
  const strList = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  const run: UiRun = {
    state,
    mode,
    workId: str(raw.workId) ?? null,
    shows: shows.filter((s): s is UiShow => s !== null),
    resolved: (Array.isArray(raw.resolved) ? raw.resolved : []).flatMap((r) =>
      isRecord(r) && str(r.name) && str(r.id) ? [{ name: r.name, id: r.id }] : [],
    ),
    candidates: (Array.isArray(raw.candidates) ? raw.candidates : []).flatMap((g) =>
      isRecord(g) && str(g.name) && Array.isArray(g.options)
        ? [{ name: g.name, options: g.options.flatMap((o: unknown) => (isRecord(o) && str(o.id) && str(o.name) ? [{ id: o.id, name: o.name }] : [])) }]
        : [],
    ),
    unresolved: strList(raw.unresolved),
    notFetched: strList(raw.notFetched),
    budget: isRecord(raw.budget) && num(raw.budget.used) !== undefined && num(raw.budget.max) !== undefined
      ? { used: raw.budget.used, max: raw.budget.max }
      : null,
    ...(num(raw.retryAfterSeconds) !== undefined && { retryAfterSeconds: raw.retryAfterSeconds as number }),
    note: str(raw.error),
  };
  // Results that lost their provenance make the whole response untrustworthy.
  if (shows.some((s) => s === null)) return { ...run, state: "malformed", shows: [] };
  if (state === "needs_confirmation" && run.candidates.every((g) => g.options.length < 2)) return { ...run, state: "malformed" };
  if (state === "ok" && run.shows.length === 0) return { ...run, state: "empty" };
  return run;
}

const pretty = (k: string) => k.replace(/_/g, " ");

export function adaptAudience(env: unknown): Enrichment<UiAudience> {
  if (!isRecord(env)) return { state: "unavailable", reason: "malformed" };
  if (env.status !== "ok" && env.status !== "empty") return { state: "unavailable", reason: str(env.error) ?? String(env.status) };
  const d = env.data;
  if (!isRecord(d)) return { state: "empty" };
  const rows = (o: unknown) =>
    isRecord(o)
      ? Object.entries(o)
          .flatMap(([k, v]) => (num(v) !== undefined ? [{ label: pretty(k), share: v as number }] : []))
          .sort((a, b) => b.share - a.share)
      : [];
  const age = rows(d.age);
  const gender = rows(d.gender);
  return age.length || gender.length ? { state: "ok", data: { age, gender } } : { state: "empty" };
}

export function adaptAngles(env: unknown): Enrichment<UiAngle[]> {
  if (!isRecord(env)) return { state: "unavailable", reason: "malformed" };
  if (env.status !== "ok" && env.status !== "empty") return { state: "unavailable", reason: str(env.error) ?? String(env.status) };
  const data: UiAngle[] = (Array.isArray(env.data) ? env.data : []).flatMap((t: unknown) =>
    isRecord(t) && str(t.tag) && num(t.score) !== undefined ? [{ tag: t.tag, score: t.score }] : [],
  );
  return data.length ? { state: "ok", data } : { state: "empty" };
}
