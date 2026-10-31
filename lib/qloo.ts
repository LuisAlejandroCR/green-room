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

// Display facts Qloo returned for the show itself (verified live 2026-10-31). Absent stays absent.
export interface ShowFacts {
  image?: string;
  channel?: string;
  episodes?: string;
  topics?: string[];
  topicIds?: string[]; // Qloo tag ids, same order as topics; used as a signal for "more like this"
}

export interface PodcastResult extends ShowFacts {
  id: string;
  name: string;
  description?: string;
  mode: QlooMode;
  provenance: Provenance;
}

export interface Candidate {
  id: string;
  name: string;
  image?: string;
  kind?: string; // "Book", "Film", "Artist", "Brand" from Qloo's types
  detail?: string; // disambiguation or publication year, to tell editions apart
  tags?: string[]; // the candidate's own Qloo tags (verified live 2026-10-30 on /search); they help tell matches apart
}

// Which typed pick shaped the top results most (`query.explainability`, verified live 2026-10-31).
export interface Influence {
  id: string;
  score: number;
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
// Verified live 2026-10-31: names and descriptions can arrive HTML-escaped ("&amp;"). Decoded as plain text, never as markup.
const ENTITIES: Record<string, string> = { amp: "&", quot: '"', apos: "'", "#39": "'", lt: "<", gt: ">", nbsp: " " };
export const decodeText = (v: string): string =>
  v.replace(/&(amp|quot|apos|#39|lt|gt|nbsp);/g, (_, k: string) => ENTITIES[k]).replace(/&#(\d{1,5});/g, (_, n: string) => String.fromCharCode(Number(n)));
const text = (v: unknown): string | undefined => {
  const s = str(v);
  return s === undefined ? undefined : str(decodeText(s).trim());
};
// Every podcast carries the catch-all "Podcasts" tag; it says nothing about the show.
const NOISE_TOPICS = new Set(["podcasts"]);
// Only https image URLs are passed to the browser.
const imageOf = (props: Record<string, unknown>): string | undefined => {
  const url = isRecord(props.image) ? str(props.image.url) : undefined;
  return url && /^https:\/\//.test(url) ? url : undefined;
};
const tagNames = (v: unknown): string[] =>
  [...new Set((Array.isArray(v) ? v : []).flatMap((t) => {
    const n = isRecord(t) ? text(t.name) : undefined;
    return n && !NOISE_TOPICS.has(n.toLowerCase()) ? [n] : [];
  }))];
const KINDS: Record<string, string> = {
  "urn:entity:book": "Book", "urn:entity:movie": "Film", "urn:entity:artist": "Artist", "urn:entity:brand": "Brand",
  "urn:entity:podcast": "Podcast", "urn:entity:tv_show": "TV show",
};
const numberMap = (v: unknown): Record<string, number> =>
  isRecord(v)
    ? Object.fromEntries(Object.entries(v).filter((kv): kv is [string, number] => num(kv[1]) !== undefined))
    : {};

// Documented container forms (official harness 0.1.26 source, not live-verified): `results` is either the array
// itself or an object keyed by kind, e.g. `results.entities`.
function listAt(body: unknown, key: string): unknown[] | null {
  if (!isRecord(body)) return null;
  if (Array.isArray(body.results)) return body.results;
  if (isRecord(body.results) && Array.isArray(body.results[key])) return body.results[key] as unknown[];
  return null;
}

async function badSeedPath(res: Response): Promise<boolean> {
  try {
    const body: unknown = await res.json();
    const errors = isRecord(body) && Array.isArray(body.errors) ? body.errors : [];
    return errors.some((e) => isRecord(e) && str(e.path) === "signal.interests.entities");
  } catch {
    return false;
  }
}

type Fetched =
  | { kind: "body"; body: unknown }
  | { kind: "fail"; status: QlooStatus; error: string };

async function fetchQloo(path: string, params: URLSearchParams, budget: Budget, timeoutMs = TIMEOUT_MS): Promise<Fetched> {
  const key = process.env.QLOO_API_KEY;
  if (!key) return { kind: "fail", status: "degraded", error: "missing_api_key" };
  let lastError = "qloo_unreachable";
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (!budget.take()) return { kind: "fail", status: "budget_exhausted", error: "request_budget_exhausted" };
    try {
      const res = await fetch(`${BASE_URL}${path}?${params}`, {
        headers: { "X-Api-Key": key },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.status === 429 || res.status >= 500) {
        lastError = `qloo_http_${res.status}`;
        continue;
      }
      if (!res.ok) {
        // Verified live: a 400 on signal.interests.entities means none of the seeds is usable as a signal.
        if (res.status === 400 && (await badSeedPath(res))) return { kind: "fail", status: "degraded", error: "seed_not_usable" };
        return { kind: "fail", status: "degraded", error: `qloo_http_${res.status}` };
      }
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
  timeoutMs?: number,
): Promise<QlooEnvelope<T>> {
  const mode = currentMode();
  const source = `GET ${path}`;
  const queryId = queryIdOf(path, params);
  if (mode === "sample") return envelope("ok", mode, source, queryId, sample());
  const got = await fetchQloo(path, params, budget, timeoutMs);
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
      const list = listAt(b, "entities");
      if (!list) return null;
      const out = list.flatMap((e) => {
        if (!isRecord(e)) return [];
        const id = str(e.entity_id) ?? str(e.id);
        const name = text(e.name);
        if (!id || !name) return [];
        const props = isRecord(e.properties) ? e.properties : {};
        const types = Array.isArray(e.types) ? e.types : [];
        const kind = types.map((t) => (typeof t === "string" ? KINDS[t] : undefined)).find(Boolean);
        const year = num(props.publication_year);
        const detail = text(e.disambiguation) ?? (year !== undefined ? String(year) : undefined);
        const image = imageOf(props);
        const tags = tagNames(e.tags).slice(0, 4);
        return [{ id, name, ...(image && { image }), ...(kind && { kind }), ...(detail && { detail }), ...(tags.length && { tags }) }];
      });
      return list.length > 0 && out.length === 0 ? null : out;
    },
    () => sampleSearch(query),
  );
}

// ---- Podcast recommendations

export interface RecommendPodcastsInput {
  seedEntityIds: string[];
  tagIds?: string[]; // optional tag signal ("more like this", suggested chips)
  resultIds?: string[]; // rank only these shows (shortlist comparison in one request)
  take?: number;
}

// Params allowed for podcasts: Qloo silently ignores the rest, so nothing else is sent.
// No popularity filter: popularity is an index, not reach or availability.
// Verified live 2026-10-30: signal.interests.tags and filter.results.entities both work for podcasts.
const PODCAST_PARAMS = ["filter.type", "signal.interests.entities", "signal.interests.tags", "filter.results.entities", "feature.explainability", "take"] as const;
// Verified live: with a tag signal Qloo can take more than 8 s to answer.
const SLOW_TIMEOUT_MS = 12_000;

export function buildPodcastQuery(input: RecommendPodcastsInput): URLSearchParams {
  const q = new URLSearchParams();
  q.set("filter.type", "urn:entity:podcast");
  q.set("signal.interests.entities", input.seedEntityIds.join(","));
  if (input.tagIds?.length) q.set("signal.interests.tags", input.tagIds.join(","));
  if (input.resultIds?.length) q.set("filter.results.entities", input.resultIds.join(","));
  q.set("feature.explainability", "true");
  q.set("take", String(Math.min(input.resultIds?.length || input.take || 20, MAX_TAKE)));
  for (const key of [...q.keys()]) {
    if (!(PODCAST_PARAMS as readonly string[]).includes(key)) q.delete(key);
  }
  return q;
}

interface ParsedPodcast extends ShowFacts {
  id: string;
  name: string;
  affinity?: number;
  popularity?: number;
  explanation?: string;
  description?: string;
}

function parsePodcasts(body: unknown): ParsedPodcast[] | null {
  const entities = listAt(body, "entities");
  if (!entities) return null;
  const out = entities.flatMap((e): ParsedPodcast[] => {
    if (!isRecord(e)) return [];
    // Same documented id forms as /search: `entity_id`, or `id`.
    const id = str(e.entity_id) ?? str(e.id);
    const name = text(e.name);
    if (!id || !name) return [];
    const query = isRecord(e.query) ? e.query : {};
    const props = isRecord(e.properties) ? e.properties : {};
    // Description lives at one of four documented paths (harness source); only a plain string is kept.
    const description = text(e.short_description) ?? text(e.description) ?? text(props.short_description) ?? text(props.description);
    // The explainability payload shape is unverified; only a plain string is kept.
    const seen = new Set<string>();
    const tagRows = (Array.isArray(e.tags) ? e.tags : []).flatMap((t) => {
      const tag = isRecord(t) ? text(t.name) : undefined;
      if (!tag || NOISE_TOPICS.has(tag.toLowerCase()) || seen.has(tag)) return [];
      seen.add(tag);
      return [{ name: tag, id: isRecord(t) ? str(t.id) : undefined }];
    }).slice(0, 6);
    const topics = tagRows.map((t) => t.name);
    const topicIds = tagRows.every((t) => t.id) ? tagRows.map((t) => t.id as string) : [];
    const channel = text(props.channel);
    const facts: ShowFacts = {
      ...(imageOf(props) && { image: imageOf(props) }),
      ...(channel && channel !== name && { channel }),
      ...(str(props.episode_count) && { episodes: str(props.episode_count) }),
      ...(topics.length && { topics }),
      ...(topicIds.length && { topicIds }),
    };
    return [{ id, name, affinity: num(query.affinity) ?? num(e.affinity), popularity: num(e.popularity), explanation: str(query.explainability), description, ...facts }];
  });
  return entities.length > 0 && out.length === 0 ? null : out;
}

// Verified live: with several seeds, Qloo answers 200 and lists unusable ones in `warnings[]` under the literal key "signal.interests.entities".
// Those seeds did not shape the results, so the caller must say so.
function ignoredSeedIds(body: unknown, sent: string[]): string[] {
  const warnings = isRecord(body) && Array.isArray(body.warnings) ? body.warnings : [];
  const ids = warnings.flatMap((w) => {
    const sig = isRecord(w) ? w["signal.interests.entities"] : undefined;
    return Array.isArray(sig) ? sig.filter((x): x is string => typeof x === "string") : [];
  });
  return [...new Set(ids)].filter((id) => sent.includes(id));
}

// The literal dotted key, as with warnings. Only ids the request sent are kept; sorted by effect, highest first.
function influenceOf(body: unknown, sent: string[]): Influence[] {
  const q = isRecord(body) && isRecord(body.query) ? body.query : {};
  const ex = isRecord(q.explainability) ? q.explainability : {};
  const sig = isRecord(ex.signal) && isRecord(ex.signal.interests) && isRecord(ex.signal.interests.entities)
    ? ex.signal.interests.entities
    : isRecord(ex["signal.interests.entities"]) ? ex["signal.interests.entities"] : {};
  const rows = Array.isArray((sig as Record<string, unknown>).effect_on_top10_recs) ? (sig as Record<string, unknown[]>).effect_on_top10_recs : [];
  return rows
    .flatMap((r) => (isRecord(r) && str(r.entity_id) && num(r.avg_score) !== undefined ? [{ id: r.entity_id as string, score: r.avg_score as number }] : []))
    .filter((r) => sent.includes(r.id))
    .sort((a, b) => b.score - a.score);
}

export async function recommendPodcasts(
  input: RecommendPodcastsInput,
  budget: Budget,
): Promise<QlooEnvelope<PodcastResult[]> & { ignoredSeedIds: string[]; influence: Influence[] }> {
  let ignored: string[] = [];
  let influence: Influence[] = [];
  const env = await call<ParsedPodcast[]>(
    "/v2/insights",
    buildPodcastQuery(input),
    budget,
    (b) => {
      ignored = ignoredSeedIds(b, input.seedEntityIds);
      influence = influenceOf(b, input.seedEntityIds);
      return parsePodcasts(b);
    },
    () => SAMPLE_PODCASTS,
    input.tagIds?.length ? SLOW_TIMEOUT_MS : undefined,
  );
  const source = env.mode === "sample" ? `${env.source} (synthetic fixture, no request made)` : env.source;
  const data = env.data
    ? env.data.map((p) => ({
        id: p.id,
        name: p.name,
        ...(p.description !== undefined && { description: p.description }),
        ...(p.image && { image: p.image }),
        ...(p.channel && { channel: p.channel }),
        ...(p.episodes && { episodes: p.episodes }),
        ...(p.topics && { topics: p.topics }),
        ...(p.topicIds && { topicIds: p.topicIds }),
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
  return { ...env, source, data, ignoredSeedIds: ignored, influence };
}

// ---- Optional enrichments: their failure never blocks the shortlist or the pitch draft.

export async function audienceOf(podcastId: string, budget: Budget): Promise<QlooEnvelope<Demographics>> {
  const q = new URLSearchParams({ "filter.type": "urn:demographics", "signal.interests.entities": podcastId });
  const env = await call<Demographics>(
    "/v2/insights",
    q,
    budget,
    (b) => {
      const rows = listAt(b, "demographics");
      if (!rows) return null;
      const first = rows[0];
      const d = isRecord(first) && isRecord(first.query) ? first.query : {};
      return { age: numberMap(d.age), gender: numberMap(d.gender) };
    },
    () => SAMPLE_DEMOGRAPHICS,
  );
  // A well-formed answer with nothing in it is "empty", not "ok".
  const nothing = env.data && Object.keys(env.data.age).length + Object.keys(env.data.gender).length === 0;
  return nothing ? { ...env, status: "empty", data: null } : env;
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
      const tags = listAt(b, "tags");
      if (!tags) return null;
      return tags.flatMap((t) => {
        const tag = isRecord(t) ? str(t.name) : undefined;
        const score = isRecord(t) && isRecord(t.query) ? num(t.query.affinity) : undefined;
        return tag && score !== undefined ? [{ tag, score }] : [];
      });
    },
    () => SAMPLE_ANGLES,
  );
}

// ---- Campaign desk (iteration 6). Every path below was checked with `npm run smoke:qloo` on 2026-10-30.

export interface VerifiedEntity {
  id: string;
  name: string;
  kind?: string;
}

// Server-side re-verification of IDs the client sends back ("Search Entities by ID"): an ID Qloo does not return is
// not used. One request for all IDs.
export function entitiesById(ids: string[], budget: Budget): Promise<QlooEnvelope<VerifiedEntity[]>> {
  const q = new URLSearchParams({ entity_ids: ids.join(",") });
  return call(
    "/entities",
    q,
    budget,
    (b) => {
      const list = listAt(b, "entities");
      if (!list) return null;
      return list.flatMap((e) => {
        if (!isRecord(e)) return [];
        const id = str(e.entity_id) ?? str(e.id);
        const name = text(e.name);
        const kind = (Array.isArray(e.types) ? e.types : []).map((t) => (typeof t === "string" ? KINDS[t] : undefined)).find(Boolean);
        return id && name ? [{ id, name, ...(kind && { kind }) }] : [];
      });
    },
    () => ids.map((id) => ({ id, name: id })),
  );
}

export interface TasteTag {
  id: string;
  name: string;
  score: number;
}

// Taste analysis of the work (`filter.type=urn:tag`): what its fans' taste is about. Optional enrichment.
export function tasteOf(entityId: string, budget: Budget): Promise<QlooEnvelope<TasteTag[]>> {
  const q = new URLSearchParams({ "filter.type": "urn:tag", "signal.interests.entities": entityId, take: "8" });
  return call(
    "/v2/insights",
    q,
    budget,
    (b) => {
      const tags = listAt(b, "tags");
      if (!tags) return null;
      const seen = new Set<string>(); // Qloo can return two tags with the same name (genre and keyword)
      return tags.flatMap((t) => {
        if (!isRecord(t)) return [];
        const id = str(t.tag_id) ?? str(t.id);
        const name = text(t.name);
        const score = isRecord(t.query) ? num(t.query.affinity) : undefined;
        if (!id || !name || score === undefined || NOISE_TOPICS.has(name.toLowerCase()) || seen.has(name)) return [];
        seen.add(name);
        return [{ id, name, score }];
      });
    },
    () => [],
  );
}

export interface TagHit {
  id: string;
  name: string;
}

// Tag search (`/v2/tags`, `filter.query`), for the suggested chips on the phone.
export function searchTags(query: string, budget: Budget): Promise<QlooEnvelope<TagHit[]>> {
  const q = new URLSearchParams({ "filter.query": query, take: "8" });
  return call(
    "/v2/tags",
    q,
    budget,
    (b) => {
      const tags = listAt(b, "tags");
      if (!tags) return null;
      return tags.flatMap((t) => {
        const id = isRecord(t) ? str(t.id) ?? str(t.tag_id) : undefined;
        const name = isRecord(t) ? text(t.name) : undefined;
        return id && name ? [{ id, name }] : [];
      });
    },
    () => [],
  );
}

export interface HeatCell {
  lat: number;
  lon: number;
  affinity: number;
}

// Heatmap (`filter.type=urn:heatmap`) for one show, in the United States (the only location probed live).
// Verified live: about 2048 geohash cells with latitude, longitude and query.affinity. Web only.
export function heatmapOf(podcastId: string, budget: Budget): Promise<QlooEnvelope<HeatCell[]>> {
  const q = new URLSearchParams({ "filter.type": "urn:heatmap", "signal.interests.entities": podcastId, "filter.location.query": "United States" });
  return call(
    "/v2/insights",
    q,
    budget,
    (b) => {
      const cells = listAt(b, "heatmap");
      if (!cells) return null;
      return cells.flatMap((c) => {
        const loc = isRecord(c) && isRecord(c.location) ? c.location : null;
        const lat = loc ? num(loc.latitude) : undefined;
        const lon = loc ? num(loc.longitude) : undefined;
        const affinity = isRecord(c) && isRecord(c.query) ? num(c.query.affinity) : undefined;
        return lat !== undefined && lon !== undefined && affinity !== undefined ? [{ lat, lon, affinity }] : [];
      });
    },
    () => [],
    SLOW_TIMEOUT_MS,
  );
}
