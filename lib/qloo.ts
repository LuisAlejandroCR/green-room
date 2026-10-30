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
