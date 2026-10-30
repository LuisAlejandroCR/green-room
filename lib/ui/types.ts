// types.ts: shapes the screens consume, kept apart from the Qloo envelope so the UI never reads raw API fields.
export type Mode = "live" | "sample";
export type ReachTier = "reachable" | "stretch" | "dream";

export interface UiShow {
  id: string;
  name: string;
  overlap: number;
  tier: ReachTier;
  tie: boolean;
}

export interface UiRun {
  state: "ok" | "empty" | "unresolved" | "degraded" | "failed";
  mode: Mode | null;
  workId: string | null;
  shows: UiShow[];
  unresolved: string[];
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
