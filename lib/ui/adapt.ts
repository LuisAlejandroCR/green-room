// adapt.ts: maps /api/run and /api/show responses to what the screens render. Pure, so it is unit tested.
import { REACH_MAX } from "../qloo.ts";
import type { Mode, ReachTier, UiAngle, UiAudience, UiRun } from "./types.ts";

export function tierOf(popularity: number): ReachTier {
  if (popularity <= REACH_MAX.reachable) return "reachable";
  if (popularity <= REACH_MAX.stretch) return "stretch";
  return "dream";
}

export function adaptRun(raw: any): UiRun {
  const mode: Mode | null = raw?.mode === "live" || raw?.mode === "sample" ? raw.mode : null;
  const base = { mode, workId: raw?.workId ?? null, shows: [], unresolved: [] };
  if (raw?.status === "degraded") return { ...base, state: "degraded", note: raw.error };
  if (!raw || raw.error) return { ...base, state: "failed", note: raw?.error };
  if (raw.unresolved?.length) return { ...base, state: "unresolved", unresolved: raw.unresolved };
  if (raw.status === "empty" || !raw.data?.length) return { ...base, state: "empty" };
  return {
    ...base,
    state: "ok",
    shows: raw.data.map((s: any) => ({
      id: s.id,
      name: s.name,
      overlap: s.affinity,
      tier: tierOf(s.popularity),
      tie: Boolean(s.tie),
    })),
  };
}

const pretty = (k: string) => k.replace(/_/g, " ");

export function adaptAudience(raw: any): UiAudience | null {
  const d = raw?.data;
  if (!d) return null;
  const rows = (o: Record<string, number>) =>
    Object.entries(o ?? {})
      .map(([k, v]) => ({ label: pretty(k), share: v }))
      .sort((a, b) => b.share - a.share);
  const age = rows(d.age);
  const gender = rows(d.gender);
  return age.length || gender.length ? { age, gender } : null;
}

export function adaptAngles(raw: any): UiAngle[] {
  return Array.isArray(raw?.data) ? raw.data : [];
}
