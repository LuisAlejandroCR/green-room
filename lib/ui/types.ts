// types.ts: shapes the screens consume, kept apart from the Qloo envelope so the UI never reads raw API fields.
export type Mode = "live" | "recorded" | "sample";

export interface UiProvenance {
  entityId: string;
  queryId: string;
  source: string;
  retrievedAt: string;
  affinity?: number;
  explanation?: string;
  popularity?: number;
}

export interface UiShow {
  id: string;
  name: string;
  description?: string; // from Qloo only; absent stays absent
  mode: Mode;
  overlap?: number; // Qloo affinity; absent stays absent
  popularity?: number; // Qloo popularity index; absent stays absent
  image?: string; // Qloo cover art (https only)
  channel?: string;
  episodes?: string;
  topics?: string[]; // the show's own Qloo tags
  topicIds?: string[]; // Qloo tag ids, same order as topics
  provenance: UiProvenance;
}

export interface UiCandidate {
  id: string;
  name: string;
  image?: string;
  kind?: string;
  detail?: string;
  tags?: string[];
}

export interface UiCandidateGroup {
  name: string;
  options: UiCandidate[];
}

export type RunUiState =
  | "ok"
  | "partial"
  | "empty"
  | "unresolved"
  | "needs_confirmation"
  | "degraded"
  | "malformed"
  | "failed"
  | "rate_limited"
  | "cancelled";

export interface UiRun {
  state: RunUiState;
  mode: Mode | null;
  workId: string | null;
  shows: UiShow[];
  resolved: { name: string; id: string }[];
  candidates: UiCandidateGroup[];
  unresolved: string[];
  notFetched: string[];
  ignoredSeeds: string[];
  influence: { name: string; score: number }[];
  seedIds: string[];
  taste: { id: string; name: string; score: number }[];
  recordedAt?: string; // RECORDED tour only
  budget: { used: number; max: number } | null;
  retryAfterSeconds?: number;
  note?: string;
}

export interface UiAudience {
  age: { label: string; share: number }[];
  gender: { label: string; share: number }[];
}

export interface UiAngle {
  tag: string;
  score: number;
}

// One optional enrichment part: its failure is shown but never blocks anything else.
export type Enrichment<T> =
  | { state: "ok"; data: T }
  | { state: "empty" }
  | { state: "unavailable"; reason: string };
