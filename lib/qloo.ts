// Single Qloo client. Never throws: every call returns a typed envelope.
// The key stays on the server (QLOO_API_KEY); modes: live | sample.

export type QlooStatus = "ok" | "empty" | "degraded" | "failed";
export type QlooMode = "live" | "sample";

export interface QlooEnvelope<T> {
  status: QlooStatus;
  mode: QlooMode;
  source: string;
  checked_at: string;
  data: T | null;
  error?: string;
}

export interface PodcastMatch {
  id: string;
  name: string;
  affinity: number; // Qloo query.affinity, 0-1
  popularity: number; // 0-1
}

const BASE_URL = process.env.QLOO_BASE_URL ?? "https://hackathon.api.qloo.com";
const MAX_TAKE = 50;
const TIMEOUT_MS = 5000;

export function currentMode(): QlooMode {
  return process.env.QLOO_MODE === "live" && Boolean(process.env.QLOO_API_KEY)
    ? "live"
    : "sample";
}

function envelope<T>(
  status: QlooStatus,
  mode: QlooMode,
  source: string,
  data: T | null,
  error?: string,
): QlooEnvelope<T> {
  return { status, mode, source, checked_at: new Date().toISOString(), data, error };
}

export interface RecommendPodcastsInput {
  seedEntityIds: string[];
  popularityMax?: number;
  excludeEntityIds?: string[];
  take?: number;
}

// Params allowed per filter.type: Qloo silently ignores the rest, so we never send them.
const PODCAST_PARAMS = [
  "filter.type",
  "signal.interests.entities",
  "filter.popularity.max",
  "filter.exclude.entities",
  "feature.explainability",
  "take",
] as const;

export function buildPodcastQuery(input: RecommendPodcastsInput): URLSearchParams {
  const q = new URLSearchParams();
  q.set("filter.type", "urn:entity:podcast");
  q.set("signal.interests.entities", input.seedEntityIds.join(","));
  if (input.popularityMax !== undefined) q.set("filter.popularity.max", String(input.popularityMax));
  if (input.excludeEntityIds?.length) q.set("filter.exclude.entities", input.excludeEntityIds.join(","));
  q.set("feature.explainability", "true");
  q.set("take", String(Math.min(input.take ?? 20, MAX_TAKE)));
  for (const key of q.keys()) {
    if (!(PODCAST_PARAMS as readonly string[]).includes(key)) q.delete(key);
  }
  return q;
}

export async function recommendPodcasts(
  input: RecommendPodcastsInput,
): Promise<QlooEnvelope<PodcastMatch[]>> {
  const source = "GET /v2/insights";
  const mode = currentMode();
  if (mode === "sample") {
    const { SAMPLE_PODCASTS } = await import("./samples");
    return envelope("ok", "sample", source, SAMPLE_PODCASTS);
  }
  try {
    const res = await fetch(`${BASE_URL}/v2/insights?${buildPodcastQuery(input)}`, {
      headers: { "X-Api-Key": process.env.QLOO_API_KEY as string },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return envelope<PodcastMatch[]>("degraded", mode, source, null, `qloo_http_${res.status}`);
    const body = (await res.json()) as {
      results?: { entities?: Array<{ entity_id: string; name: string; popularity?: number; query?: { affinity?: number } }> };
    };
    const entities = body.results?.entities ?? [];
    const data = entities.map((e) => ({
      id: e.entity_id,
      name: e.name,
      affinity: e.query?.affinity ?? 0,
      popularity: e.popularity ?? 0,
    }));
    return envelope(data.length ? "ok" : "empty", mode, source, data);
  } catch {
    return envelope<PodcastMatch[]>("degraded", mode, source, null, "qloo_unreachable");
  }
}

// ---- Additional endpoints. Response shapes follow the harness spec and community probes;
// ---- verify each against the live key in the smoke test (see PROGRESS.md).

export interface ResolvedEntity {
  id: string;
  name: string;
}

async function get<T>(
  path: string,
  params: URLSearchParams,
  parse: (body: any) => T,
  sample: () => Promise<T>,
): Promise<QlooEnvelope<T>> {
  const source = `GET ${path}`;
  const mode = currentMode();
  if (mode === "sample") return envelope("ok", mode, source, await sample());
  try {
    const res = await fetch(`${BASE_URL}${path}?${params}`, {
      headers: { "X-Api-Key": process.env.QLOO_API_KEY as string },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return envelope<T>("degraded", mode, source, null, `qloo_http_${res.status}`);
    const data = parse(await res.json());
    const empty = Array.isArray(data) && data.length === 0;
    return envelope(empty ? "empty" : "ok", mode, source, data);
  } catch {
    return envelope<T>("degraded", mode, source, null, "qloo_unreachable");
  }
}

export function searchEntity(query: string, type: string): Promise<QlooEnvelope<ResolvedEntity[]>> {
  const q = new URLSearchParams({ query, types: type, take: "5" });
  return get(
    "/search",
    q,
    (b) => (b.results ?? []).map((e: any) => ({ id: e.entity_id ?? e.id, name: e.name })),
    async () => [{ id: "sample-seed", name: query }],
  );
}

export interface Demographics {
  age: Record<string, number>;
  gender: Record<string, number>;
}

export function audienceOf(podcastId: string): Promise<QlooEnvelope<Demographics>> {
  const q = new URLSearchParams({
    "filter.type": "urn:demographics",
    "signal.interests.entities": podcastId,
  });
  return get(
    "/v2/insights",
    q,
    (b) => {
      const d = b.results?.demographics?.[0]?.query ?? {};
      return { age: d.age ?? {}, gender: d.gender ?? {} };
    },
    async () => ({ age: { "25_to_29": 0.4 }, gender: { female: 0.55, male: 0.45 } }),
  );
}

export function sharedAngles(workId: string, podcastId: string): Promise<QlooEnvelope<{ tag: string; score: number }[]>> {
  const q = new URLSearchParams({
    "a.signal.interests.entities": workId,
    "b.signal.interests.entities": podcastId,
    take: "5",
  });
  return get(
    "/v2/analysis/compare",
    q,
    (b) => (b.results?.tags ?? []).map((t: any) => ({ tag: t.name, score: t.query?.affinity ?? 0 })),
    async () => [{ tag: "sample tag", score: 0.5 }],
  );
}

// Rank a fixed list in one call so scores are comparable.
export function rankShortlist(seedEntityIds: string[], candidateIds: string[]): Promise<QlooEnvelope<PodcastMatch[]>> {
  const q = new URLSearchParams({
    "filter.type": "urn:entity:podcast",
    "signal.interests.entities": seedEntityIds.join(","),
    "filter.results.entities": candidateIds.join(","),
    take: String(Math.min(candidateIds.length, MAX_TAKE)),
  });
  return get(
    "/v2/insights",
    q,
    (b) =>
      (b.results?.entities ?? []).map((e: any) => ({
        id: e.entity_id,
        name: e.name,
        affinity: e.query?.affinity ?? 0,
        popularity: e.popularity ?? 0,
      })),
    async () => (await import("./samples")).SAMPLE_PODCASTS,
  );
}

// Reach levels -> popularity ceiling. Thresholds are provisional until seen on real data.
export const REACH_MAX = { reachable: 0.3, stretch: 0.6, dream: 1 } as const;
export type Reach = keyof typeof REACH_MAX;

// Differences under 0.05 are ties; code decides, not the model.
export function markTies(list: PodcastMatch[]): (PodcastMatch & { tie: boolean })[] {
  const sorted = [...list].sort((a, b) => b.affinity - a.affinity);
  return sorted.map((p, i) => ({
    ...p,
    tie:
      (i > 0 && sorted[i - 1].affinity - p.affinity < 0.05) ||
      (i < sorted.length - 1 && p.affinity - sorted[i + 1].affinity < 0.05),
  }));
}
