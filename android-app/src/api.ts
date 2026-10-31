// api.ts: the only network code in the app. It calls the deployed Green Room server (/api/run, /api/show, /api/pitch).
// The server holds QLOO_API_KEY, JEV_API_KEY and the model keys; this file sends only the brief, entity ids and
// the Qloo facts a pitch may use (/api/pitch).
import { apiBase, parseDetail, parsePitch, type Brief, type Pitch, type Run, type ShowDetail } from "./logic";

export const API_BASE = apiBase(process.env.EXPO_PUBLIC_API_BASE);

const TIMEOUT_MS = 30000;

async function call(path: string, init?: RequestInit): Promise<unknown> {
  if (!API_BASE) throw new Error("api_not_configured");
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, { ...init, signal: ctrl.signal });
    if (res.status === 429) throw new Error("rate_limited");
    if (!res.ok) throw new Error(`http_${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

export async function runBrief(brief: Brief): Promise<Run> {
  const json = (await call("/api/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(brief),
  })) as Run;
  if (!json || !Array.isArray(json.results) || !Array.isArray(json.candidates)) throw new Error("malformed");
  return json;
}

export async function showDetail(workId: string, showId: string): Promise<ShowDetail> {
  const q = `work=${encodeURIComponent(workId)}&show=${encodeURIComponent(showId)}`;
  return parseDetail(await call(`/api/show?${q}`));
}

export interface PitchInput {
  work: string;
  show: string;
  showTopics: string[];
  sharedThemes: string[];
  workTaste: string[];
  sourceMode: string;
}

/** Claude drafts from the Qloo evidence on the server; the server falls back to the template and says so. */
export async function requestPitch(input: PitchInput): Promise<Pitch> {
  const p = parsePitch(await call("/api/pitch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }));
  if (!p) throw new Error("malformed");
  return p;
}
