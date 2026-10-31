// logic.ts: pure helpers for the native app (no React Native imports, so the root node tests can load it).
// Response shapes mirror lib/run.ts and /api/show; the API base comes from EXPO_PUBLIC_API_BASE at build time.
// No keys live here: Qloo, JEV and Claude are called only by the deployed server.

export type QlooMode = "live" | "sample";

export interface Show {
  id: string;
  name: string;
  description?: string;
  mode: QlooMode;
  image?: string;
  channel?: string;
  episodes?: string;
  topics?: string[];
  topicIds?: string[];
  provenance: { affinity?: number; popularity?: number };
}

export interface Candidate {
  id: string;
  name: string;
  kind?: string;
  detail?: string;
}

export interface Run {
  state: "ok" | "needs_confirmation" | "unresolved" | "empty" | "partial" | "degraded" | "malformed";
  mode: QlooMode;
  workId: string | null;
  results: Show[];
  candidates: { name: string; options: Candidate[] }[];
  unresolved: string[];
  error?: string;
}

export interface Brief {
  work: string;
  seeds: string[];
  confirmed: Record<string, string>;
  tags?: string[];
}

export interface ShowDetail {
  angles: string[];
  ages: string[];
}

// Same human-picked example as lib/demo.ts, so the APK demo skips the confirmation step too.
export const DEMO_BRIEF: Brief = {
  work: "Atomic Habits",
  seeds: ["Nike Training Club"],
  confirmed: {
    "Atomic Habits": "903F2078-A8A5-48C0-B254-89572DA0A047",
    "Nike Training Club": "43A36E73-9BC7-4B09-A116-78E51554C3E3",
  },
};

export const GOAL = 3;

/** The API base without a trailing slash, or null when the build was made without one (or with the eas.json
 * placeholder still in place). Only https is accepted. */
export function apiBase(raw: string | undefined): string | null {
  const v = raw?.trim().replace(/\/+$/, "");
  return v && /^https:\/\/[^\s/]+$/.test(v) && !v.includes("SET-YOUR") ? v : null;
}

/** Comma-separated seeds, trimmed and capped at 3 like the server. */
export function parseSeeds(text: string): string[] {
  return text.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 3);
}

/** Fit 0-100 from Qloo affinity, or undefined when Qloo did not return one (absent stays absent). */
export function fitOf(show: Show): number | undefined {
  const a = show.provenance?.affinity;
  return typeof a === "number" && a >= 0 && a <= 1 ? Math.round(a * 100) : undefined;
}

/** One plain line about the show: the first sentence of Qloo's description, else its channel. */
export function plainLine(show: Show): string | undefined {
  const first = show.description?.split(/(?<=[.!?])\s/)[0];
  if (first) return first.length > 110 ? `${first.slice(0, 107).trimEnd()}…` : first;
  return show.channel ? `From ${show.channel}` : undefined;
}

/** Only states with shows to swipe open the deck. */
export function hasDeck(run: Run | null): boolean {
  return !!run && (run.state === "ok" || run.state === "partial") && run.results.length > 0;
}

/** A plain message for every state that is not a deck or a confirmation. */
export function stateMessage(run: Run): string {
  switch (run.state) {
    case "unresolved": return `Qloo couldn't find ${run.unresolved.join(", ") || "that title"}. Try the exact title.`;
    case "empty": return "Qloo found no podcasts for this one yet. Try another title or add a show fans love.";
    case "degraded": return "Qloo is busy right now. Try again in a minute.";
    default: return "Something went wrong reading the answer. Try again.";
  }
}

/** Reads the /api/show envelopes; a failed part is simply left out. */
export function parseDetail(json: unknown): ShowDetail {
  const j = (json ?? {}) as { angles?: { status?: string; data?: unknown }; audience?: { status?: string; data?: unknown } };
  const angles = j.angles?.status === "ok" && Array.isArray(j.angles.data)
    ? j.angles.data.map((a: { tag?: unknown }) => a?.tag).filter((t): t is string => typeof t === "string").slice(0, 3)
    : [];
  const age = j.audience?.status === "ok" ? (j.audience.data as { age?: Record<string, number> } | null)?.age : undefined;
  const ages = age
    ? Object.entries(age).filter(([, v]) => typeof v === "number" && v > 0).sort((a, b) => b[1] - a[1]).slice(0, 2)
      .map(([k]) => k.replace(/_to_/g, "–").replace(/_and_/g, " & ").replace(/_/g, " "))
    : [];
  return { angles, ages };
}

/** Same deterministic draft as lib/pitch.ts: only the work, the show name and tags Qloo returned. */
export function draftPitch(work: string, show: string, themes: string[], topics: string[] = []): string {
  const shared = themes.slice(0, 3);
  const listed = topics.slice(0, 3);
  return [
    `Hi there, I'd love to share ${work} with ${show}'s listeners.`,
    shared.length
      ? `Qloo's audience data points to shared themes: ${shared.join(", ")}.`
      : listed.length
        ? `Qloo lists your show under ${listed.join(", ")}, and its audience data suggests a thematic fit.`
        : "Qloo's audience data suggests a thematic fit.",
    "Happy to send a short brief and suggested questions.",
    "[Your name]",
  ].join("\n\n");
}
