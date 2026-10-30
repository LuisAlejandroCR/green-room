// Single Qloo client. Never throws: every call returns a typed envelope.
// The key stays on the server (QLOO_API_KEY). Modes: live | sample. Sample is chosen by configuration only;
// a live failure never falls back to sample data.
import { createHash } from "node:crypto";
import {
  SAMPLE_ANGLES,
  SAMPLE_DEMOGRAPHICS,
  SAMPLE_PODCASTS,
  sampleSearch,
} from "./samples.ts";

export type QlooStatus = "ok" | "empty" | "degraded" | "malformed" | "budget_exhausted";
export type QlooMode = "live" | "sample";

export const MAX_REQUESTS_PER_RUN = 8;
const BASE_URL = process.env.QLOO_BASE_URL ?? "https://hackathon.api.qloo.com";
const MAX_TAKE = 50;
const TIMEOUT_MS = 5000;
const MAX_ATTEMPTS = 2; // one retry on 429/5xx/network; each attempt spends budget

// Request-scoped: create one per run, never share across requests.
export interface Budget {
  readonly max: number;
  readonly used: number;
  take(): boolean;
}

export function createBudget(max: number = MAX_REQUESTS_PER_RUN): Budget {
  let used = 0;
  return {
    max,
    get used() {
      return used;
    },
    take() {
      if (used >= max) return false;
      used += 1;
      return true;
    },
  };
}

export interface QlooEnvelope<T> {
  status: QlooStatus;
  mode: QlooMode;
  source: string;
  queryId: string;
  retrievedAt: string;
  data: T | null;
  error?: string;
}

export interface Provenance {
  entityId: string;
  queryId: string;
  source: string;
  retrievedAt: string;
  affinity?: number;
  explanation?: string;
  popularity?: number;
}

export interface PodcastResult {
  id: string;
  name: string;
  description?: string;
  mode: QlooMode;
  provenance: Provenance;
}

export interface Candidate {
  id: string;
  name: string;
}

export interface Demographics {
  age: Record<string, number>;
  gender: Record<string, number>;
}

export interface SharedAngle {
  tag: string;
  score: number;
}

export function currentMode(): QlooMode {
  return process.env.QLOO_MODE === "live" ? "live" : "sample";
}

function queryIdOf(path: string, params: URLSearchParams): string {
  const sorted = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
  const canon = `${path}?${sorted.map(([k, v]) => `${k}=${v}`).join("&")}`;
  return `q_${createHash("sha256").update(canon).digest("hex").slice(0, 12)}`;
}

function envelope<T>(
  status: QlooStatus,
  mode: QlooMode,
  source: string,
  queryId: string,
  data: T | null,
  error?: string,
): QlooEnvelope<T> {
  return { status, mode, source, queryId, retrievedAt: new Date().toISOString(), data, error };
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const str = (v: unknown): string | undefined => (typeof v === "string" && v.length > 0 ? v : undefined);
const numberMap = (v: unknown): Record<string, number> =>
  isRecord(v)
    ? Object.fromEntries(Object.entries(v).filter((kv): kv is [string, number] => num(kv[1]) !== undefined))
    : {};

type Fetched =
  | { kind: "body"; body: unknown }
  | { kind: "fail"; status: QlooStatus; error: string };

async function fetchQloo(path: string, params: URLSearchParams, budget: Budget): Promise<Fetched> {
  const key = process.env.QLOO_API_KEY;
  if (!key) return { kind: "fail", status: "degraded", error: "missing_api_key" };
  let lastError = "qloo_unreachable";
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (!budget.take()) return { kind: "fail", status: "budget_exhausted", error: "request_budget_exhausted" };
    try {
      const res = await fetch(`${BASE_URL}${path}?${params}`, {
        headers: { "X-Api-Key": key },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.status === 429 || res.status >= 500) {
        lastError = `qloo_http_${res.status}`;
        continue;
      }
      if (!res.ok) return { kind: "fail", status: "degraded", error: `qloo_http_${res.status}` };
      try {
        return { kind: "body", body: await res.json() };
      } catch {
        return { kind: "fail", status: "malformed", error: "invalid_json" };
      }
    } catch {
      lastError = "qloo_unreachable";
    }
  }
  return { kind: "fail", status: "degraded", error: lastError };
}

// One call path for every endpoint. `sample` runs only when the configured mode is sample and spends no budget.
async function call<T>(
  path: string,
  params: URLSearchParams,
  budget: Budget,
  parse: (body: unknown) => T | null, // null = malformed
  sample: () => T,
): Promise<QlooEnvelope<T>> {
  const mode = currentMode();
  const source = `GET ${path}`;
  const queryId = queryIdOf(path, params);
  if (mode === "sample") return envelope("ok", mode, source, queryId, sample());
  const got = await fetchQloo(path, params, budget);
  if (got.kind === "fail") return envelope<T>(got.status, mode, source, queryId, null, got.error);
  const data = parse(got.body);
  if (data === null) return envelope<T>("malformed", mode, source, queryId, null, "unexpected_shape");
  const empty = Array.isArray(data) && data.length === 0;
  return envelope(empty ? "empty" : "ok", mode, source, queryId, data);
}

// ---- Search (entity resolution)

export function searchEntity(query: string, type: string, budget: Budget): Promise<QlooEnvelope<Candidate[]>> {
  const q = new URLSearchParams({ query, types: type, take: "5" });
  return call(
    "/search",
    q,
    budget,
    (b) => {
      const list = isRecord(b) ? b.results : undefined;
      if (!Array.isArray(list)) return null;
      const out = list.flatMap((e) => {
        const id = isRecord(e) ? (str(e.entity_id) ?? str(e.id)) : undefined;
        const name = isRecord(e) ? str(e.name) : undefined;
        return id && name ? [{ id, name }] : [];
      });
      return list.length > 0 && out.length === 0 ? null : out;
    },
    () => sampleSearch(query),
  );
}

// ---- Podcast recommendations

export interface RecommendPodcastsInput {
  seedEntityIds: string[];
  take?: number;
}

// Params allowed for podcasts: Qloo silently ignores the rest, so nothing else is sent.
// No popularity filter: popularity is an index, not reach or availability.
const PODCAST_PARAMS = ["filter.type", "signal.interests.entities", "feature.explainability", "take"] as const;

export function buildPodcastQuery(input: RecommendPodcastsInput): URLSearchParams {
  const q = new URLSearchParams();
  q.set("filter.type", "urn:entity:podcast");
  q.set("signal.interests.entities", input.seedEntityIds.join(","));
  q.set("feature.explainability", "true");
  q.set("take", String(Math.min(input.take ?? 20, MAX_TAKE)));
  for (const key of [...q.keys()]) {
    if (!(PODCAST_PARAMS as readonly string[]).includes(key)) q.delete(key);
  }
  return q;
}

interface ParsedPodcast {
  id: string;
  name: string;
  affinity?: number;
  popularity?: number;
  explanation?: string;
  description?: string;
}

function parsePodcasts(body: unknown): ParsedPodcast[] | null {
  const entities = isRecord(body) && isRecord(body.results) ? body.results.entities : undefined;
  if (!Array.isArray(entities)) return null;
  const out = entities.flatMap((e): ParsedPodcast[] => {
    if (!isRecord(e)) return [];
    const id = str(e.entity_id);
    const name = str(e.name);
    if (!id || !name) return [];
    const query = isRecord(e.query) ? e.query : {};
    // The explainability payload shape is unverified; only a plain string is kept.
    const props = isRecord(e.properties) ? e.properties : {};
    // `properties.description` is unverified against live data; only a plain string is kept.
    return [{ id, name, affinity: num(query.affinity), popularity: num(e.popularity), explanation: str(query.explainability), description: str(props.description) }];
  });
  return entities.length > 0 && out.length === 0 ? null : out;
}

export async function recommendPodcasts(
  input: RecommendPodcastsInput,
  budget: Budget,
): Promise<QlooEnvelope<PodcastResult[]>> {
  const env = await call<ParsedPodcast[]>(
    "/v2/insights",
    buildPodcastQuery(input),
    budget,
    parsePodcasts,
    () => SAMPLE_PODCASTS,
  );
  const source = env.mode === "sample" ? `${env.source} (synthetic fixture, no request made)` : env.source;
  const data = env.data
    ? env.data.map((p) => ({
        id: p.id,
        name: p.name,
        ...(p.description !== undefined && { description: p.description }),
        mode: env.mode,
        provenance: {
          entityId: p.id,
          queryId: env.queryId,
          source,
          retrievedAt: env.retrievedAt,
          ...(p.affinity !== undefined && { affinity: p.affinity }),
          ...(p.popularity !== undefined && { popularity: p.popularity }),
          ...(p.explanation !== undefined && { explanation: p.explanation }),
        },
      }))
    : null;
  return { ...env, source, data };
}

// ---- Optional enrichments: their failure never blocks the shortlist or the pitch draft.

export function audienceOf(podcastId: string, budget: Budget): Promise<QlooEnvelope<Demographics>> {
  const q = new URLSearchParams({ "filter.type": "urn:demographics", "signal.interests.entities": podcastId });
  return call(
    "/v2/insights",
    q,
    budget,
    (b) => {
      if (!isRecord(b) || !isRecord(b.results)) return null;
      const first = Array.isArray(b.results.demographics) ? b.results.demographics[0] : undefined;
      const d = isRecord(first) && isRecord(first.query) ? first.query : {};
      return { age: numberMap(d.age), gender: numberMap(d.gender) };
    },
    () => SAMPLE_DEMOGRAPHICS,
  );
}

export function sharedAngles(workId: string, podcastId: string, budget: Budget): Promise<QlooEnvelope<SharedAngle[]>> {
  const q = new URLSearchParams({
    "a.signal.interests.entities": workId,
    "b.signal.interests.entities": podcastId,
    take: "5",
  });
  return call(
    "/v2/analysis/compare",
    q,
    budget,
    (b) => {
      const tags = isRecord(b) && isRecord(b.results) ? b.results.tags : undefined;
      if (!Array.isArray(tags)) return null;
      return tags.flatMap((t) => {
        const tag = isRecord(t) ? str(t.name) : undefined;
        const score = isRecord(t) && isRecord(t.query) ? num(t.query.affinity) : undefined;
        return tag && score !== undefined ? [{ tag, score }] : [];
      });
    },
    () => SAMPLE_ANGLES,
  );
}
