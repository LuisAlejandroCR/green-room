// api.ts: the only network code in the app. It calls the deployed Green Room server's /api/run and /api/show.
// The server holds QLOO_API_KEY and JEV_API_KEY; this file sends only the brief and two entity ids.
import { apiBase, parseDetail, type Brief, type Run, type ShowDetail } from "./logic";

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
