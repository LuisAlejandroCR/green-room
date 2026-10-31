// smoke.ts: live-contract smoke test for the Qloo API. Output is deliberately structural: endpoint, HTTP status,
// field paths (names and JS types only, never values), result counts, numeric rate-limit headers and a verdict.
// It never prints the API key or any response body, and it records nothing to disk.

export interface Expectation {
  path: string;
  required: boolean;
  present: boolean;
}

export interface SmokeCheck {
  name: string;
  endpoint: string;
  paramKeys: string[];
  httpStatus: number | null;
  resultCount: number | null;
  fieldPaths: string[];
  rateLimit: Record<string, string>;
  expectations: Expectation[];
  outcome: "pass" | "fail" | "skipped";
  note?: string;
}

type Json = unknown;
const isRecord = (v: Json): v is Record<string, Json> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Structural paths only, e.g. `results.entities[].popularity:number`. Values are never included. */
export function fieldPaths(value: Json, max = 60): string[] {
  const out = new Set<string>();
  const walk = (v: Json, path: string, depth: number) => {
    if (out.size >= max || depth > 6) return;
    if (Array.isArray(v)) {
      for (const item of v.slice(0, 5)) walk(item, `${path}[]`, depth + 1);
      if (v.length === 0) out.add(`${path}[]`);
    } else if (isRecord(v)) {
      for (const [k, child] of Object.entries(v)) walk(child, path ? `${path}.${k}` : k, depth + 1);
    } else if (path) {
      out.add(`${path}:${v === null ? "null" : typeof v}`);
    }
  };
  walk(value, "", 0);
  return [...out].sort();
}

const hasPath = (paths: string[], path: string) => paths.some((p) => p === path || p.startsWith(`${path}:`) || p.startsWith(`${path}.`) || p.startsWith(`${path}[]`));

export function redact(text: string, secrets: string[]): string {
  return secrets.filter(Boolean).reduce((t, s) => t.split(s).join("[redacted]"), text);
}

/** Only numeric rate-limit / retry headers are kept; anything else is reported as non-numeric. */
export function rateLimitHeaders(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, name) => {
    if (/ratelimit|retry-after/i.test(name)) out[name.toLowerCase()] = /^\d+$/.test(value.trim()) ? value.trim() : "<non-numeric>";
  });
  return out;
}

function listAt(body: Json, key: string): Json[] | null {
  if (!isRecord(body)) return null;
  if (Array.isArray(body.results)) return body.results;
  if (isRecord(body.results) && Array.isArray(body.results[key])) return body.results[key] as Json[];
  return null;
}

export interface SmokeOptions {
  key: string;
  baseUrl: string;
  fetchImpl?: typeof fetch;
  work?: string;
}

interface Probe {
  status: number | null;
  body: Json;
  headers: Record<string, string>;
  error?: string;
}

async function probe(o: SmokeOptions, path: string, params: Record<string, string>): Promise<Probe> {
  const f = o.fetchImpl ?? fetch;
  try {
    const res = await f(`${o.baseUrl}${path}?${new URLSearchParams(params)}`, {
      headers: { "X-Api-Key": o.key },
      signal: AbortSignal.timeout(15000),
    });
    let body: Json = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { status: res.status, body, headers: rateLimitHeaders(res.headers) };
  } catch (e) {
    return { status: null, body: null, headers: {}, error: redact(e instanceof Error ? e.name : "error", [o.key]) };
  }
}

function check(
  name: string,
  path: string,
  params: Record<string, string>,
  p: Probe,
  listKey: string | null,
  expected: { path: string; required: boolean }[],
  outcomeOk: (p: Probe, count: number | null) => boolean,
  note?: string,
): SmokeCheck {
  const paths = fieldPaths(p.body);
  const count = listKey ? (listAt(p.body, listKey)?.length ?? null) : null;
  return {
    name,
    endpoint: `GET ${path}`,
    paramKeys: Object.keys(params).sort(),
    httpStatus: p.status,
    resultCount: count,
    fieldPaths: paths,
    rateLimit: p.headers,
    expectations: expected.map((e) => ({ ...e, present: hasPath(paths, e.path) })),
    outcome: outcomeOk(p, count) ? "pass" : "fail",
    note: p.error ?? (errorParams(p.body).length ? `${note ? `${note}; ` : ""}rejected params: ${errorParams(p.body).join(", ")}` : note),
  };
}

// A 4xx names the offending request parameter in `errors[].path`. That is a parameter name (structure), so it is kept;
// it is shown only when it looks like a dotted param key, never free text.
const errorParams = (body: Json): string[] =>
  isRecord(body) && Array.isArray(body.errors)
    ? body.errors.flatMap((e) => (isRecord(e) && typeof e.path === "string" && /^[a-z_.]{1,60}$/.test(e.path) ? [e.path] : []))
    : [];

const skipped = (name: string, path: string, why: string): SmokeCheck => ({
  name, endpoint: `GET ${path}`, paramKeys: [], httpStatus: null, resultCount: null, fieldPaths: [], rateLimit: {},
  expectations: [], outcome: "skipped", note: why,
});

const failsRequired = (c: SmokeCheck) => c.expectations.some((e) => e.required && !e.present);

export async function runSmoke(o: SmokeOptions): Promise<SmokeCheck[]> {
  const work = o.work ?? "Atomic Habits";
  const checks: SmokeCheck[] = [];
  const ok200 = (p: Probe) => p.status === 200;

  // 1. search: single type, then the multi-type list the app sends (assumed to work; this verifies it).
  const sParams = { query: work, types: "urn:entity:book", take: "5" };
  const s = await probe(o, "/search", sParams);
  checks.push(check("search (one type)", "/search", sParams, s, "results", [
    { path: "results[].entity_id", required: true }, { path: "results[].name", required: true },
  ], (p, n) => ok200(p) && (n ?? 0) > 0));
  const mParams = { query: work, types: "urn:entity:book,urn:entity:brand,urn:entity:movie,urn:entity:artist", take: "5" };
  const m = await probe(o, "/search", mParams);
  checks.push(check("search (multi-type, as the app sends)", "/search", mParams, m, "results", [
    { path: "results[].entity_id", required: true }, { path: "results[].name", required: true },
  ], (p) => ok200(p), "informational: a 4xx here means the app must send one type per request"));

  const hitIds = (listAt(s.body, "results") ?? []).flatMap((r) => (isRecord(r) && typeof r.entity_id === "string" ? [r.entity_id] : []));
  let workId: string | null = null;
  if (hitIds.length === 0) {
    for (const [n, p] of [["podcast insights", "/v2/insights"], ["popularity filter", "/v2/insights"], ["compare", "/v2/analysis/compare"], ["demographics", "/v2/insights"]] as const) {
      checks.push(skipped(n, p, "no entity id from search"));
    }
  } else {
    // 2. podcast insights (exactly what the app sends). Live, some search hits are rejected as signals with a 400,
    // so use the first hit that works and keep the last attempt if none does.
    workId = hitIds[0];
    let iParams: Record<string, string> = {};
    let i: Probe | undefined;
    for (const id of hitIds) {
      iParams = { "filter.type": "urn:entity:podcast", "signal.interests.entities": id, "feature.explainability": "true", take: "20" };
      i = await probe(o, "/v2/insights", iParams);
      workId = id;
      if (ok200(i) && (listAt(i.body, "entities")?.length ?? 0) > 0) break;
    }
    if (!i) throw new Error("unreachable: hitIds is non-empty");
    const ic = check("podcast insights", "/v2/insights", iParams, i, "entities", [
      { path: "results.entities[].entity_id", required: true }, { path: "results.entities[].name", required: true },
      { path: "results.entities[].query.affinity", required: false }, { path: "results.entities[].popularity", required: false },
      { path: "results.entities[].properties.description", required: false }, { path: "results.entities[].query.explainability", required: false },
    ], (p, n) => ok200(p) && (n ?? 0) > 0);
    if (failsRequired(ic)) ic.outcome = "fail";
    checks.push(ic);
    const rows = listAt(i.body, "entities") ?? [];
    const podcast = rows.find(isRecord);
    const podcastId = isRecord(podcast) && typeof podcast.entity_id === "string" ? podcast.entity_id : null;

    // 3. popularity filter: informational (the app does not send it). Detects silent ignoring.
    const fParams = { ...iParams, "filter.popularity.max": "0.5" };
    const f = await probe(o, "/v2/insights", fParams);
    const fRows = listAt(f.body, "entities") ?? [];
    const over = fRows.filter((r) => isRecord(r) && typeof r.popularity === "number" && r.popularity > 0.5).length;
    const sameCount = fRows.length === rows.length;
    checks.push(check("popularity filter (informational)", "/v2/insights", fParams, f, "entities", [
      { path: "results.entities[].popularity", required: false },
    ], (p) => ok200(p), rows.length === 0 ? "inconclusive: the unfiltered request returned no rows to compare" : over > 0 ? "parameter appears IGNORED (results above the cap returned)" : sameCount ? "inconclusive: same result count as unfiltered" : "parameter appears honored"));

    // 4. compare
    if (podcastId) {
      const cParams = { "a.signal.interests.entities": workId, "b.signal.interests.entities": podcastId, take: "5" };
      const c = await probe(o, "/v2/analysis/compare", cParams);
      checks.push(check("compare", "/v2/analysis/compare", cParams, c, "tags", [
        { path: "results.tags[].name", required: false }, { path: "results.tags[].query.affinity", required: false },
      ], (p) => ok200(p), "optional enrichment"));
      // 5. demographics
      const dParams = { "filter.type": "urn:demographics", "signal.interests.entities": podcastId };
      const d = await probe(o, "/v2/insights", dParams);
      checks.push(check("demographics", "/v2/insights", dParams, d, "demographics", [
        { path: "results.demographics[].query.age", required: false }, { path: "results.demographics[].query.gender", required: false },
      ], (p) => ok200(p), "optional enrichment"));
      checks.push(...(await deskChecks(o, workId, rows)));
    } else {
      checks.push(skipped("compare", "/v2/analysis/compare", "no podcast id from insights"));
      checks.push(skipped("demographics", "/v2/insights", "no podcast id from insights"));
    }
  }

  // 6. malformed request: insights without filter.type must be rejected (4xx), not silently accepted.
  const badParams = { "signal.interests.entities": workId ?? "x" };
  const bad = await probe(o, "/v2/insights", badParams);
  checks.push(check("malformed request", "/v2/insights", badParams, bad, null, [], (p) => p.status !== null && p.status >= 400 && p.status < 500, "expected a 4xx"));
  // 7. empty search
  const eParams = { query: "zzqxqzzqxq-no-such-entity", types: "urn:entity:book", take: "5" };
  const e = await probe(o, "/search", eParams);
  checks.push(check("empty search", "/search", eParams, e, "results", [], (p) => ok200(p), "informational: live search is fuzzy, so a nonsense name can still return candidates; the user confirmation step is the guard"));
  return checks;
}

// Endpoints the campaign desk uses (iteration 6): ID re-verification, taste analysis of the work, shortlist ranking in
// one request, tag search, heatmap and trending. Same rule: structure only.
async function deskChecks(o: SmokeOptions, workId: string, rows: Json[]): Promise<SmokeCheck[]> {
  const ids = rows.flatMap((r) => (isRecord(r) && typeof r.entity_id === "string" ? [r.entity_id] : [])).slice(0, 3);
  const out: SmokeCheck[] = [];
  const ok200 = (p: Probe) => p.status === 200;

  const eParams = { entity_ids: [workId, ...ids.slice(0, 1)].join(",") };
  out.push(check("entities by id (server re-verification)", "/entities", eParams, await probe(o, "/entities", eParams), "entities", [
    { path: "results[].entity_id", required: false }, { path: "results[].name", required: false }, { path: "results[].types", required: false },
  ], (p, n) => ok200(p) && (n ?? 0) > 0));

  const tParams = { "filter.type": "urn:tag", "signal.interests.entities": workId, take: "8" };
  out.push(check("taste analysis of the work", "/v2/insights", tParams, await probe(o, "/v2/insights", tParams), "tags", [
    { path: "results.tags[].name", required: false }, { path: "results.tags[].tag_id", required: false }, { path: "results.tags[].query.affinity", required: false },
  ], (p, n) => ok200(p) && (n ?? 0) > 0));

  const rParams = { "filter.type": "urn:entity:podcast", "signal.interests.entities": workId, "filter.results.entities": ids.join(","), take: String(ids.length) };
  out.push(check("shortlist ranked in one request", "/v2/insights", rParams, await probe(o, "/v2/insights", rParams), "entities", [
    { path: "results.entities[].entity_id", required: false }, { path: "results.entities[].query.affinity", required: false },
  ], (p, n) => ok200(p) && (n ?? 0) > 0));

  const sParams = { "filter.query": "habits", take: "5" };
  out.push(check("tag search", "/v2/tags", sParams, await probe(o, "/v2/tags", sParams), "tags", [
    { path: "results.tags[].name", required: false }, { path: "results.tags[].id", required: false },
  ], (p, n) => ok200(p) && (n ?? 0) > 0));

  const hParams = { "filter.type": "urn:heatmap", "signal.interests.entities": ids[0] ?? workId, "filter.location.query": "United States" };
  out.push(check("heatmap (informational)", "/v2/insights", hParams, await probe(o, "/v2/insights", hParams), "heatmap", [
    { path: "results.heatmap[].location", required: false }, { path: "results.heatmap[].query", required: false },
  ], (p) => ok200(p), "web-only enrichment; podcast coverage unknown"));

  const end = new Date();
  const start = new Date(end.getTime() - 42 * 86_400_000);
  const day = (d: Date) => d.toISOString().slice(0, 10);
  const trParams = { "filter.type": "urn:entity:podcast", "signal.interests.entities": ids[0] ?? workId, "filter.start_date": day(start), "filter.end_date": day(end) };
  out.push(check("trending podcasts (informational)", "/v2/trending", trParams, await probe(o, "/v2/trending", trParams), "trending", [
    { path: "results.trending[].entity_id", required: false }, { path: "results.trending[].query", required: false },
  ], (p) => ok200(p), "web-only sparkline; a 200 with 0 results means Qloo has no podcast trends for the window"));
  // "More like this": a show's own tag as an extra signal next to the work.
  const firstTag = rows.flatMap((r) => (isRecord(r) && Array.isArray(r.tags) ? r.tags : [])).find((t) => isRecord(t) && typeof t.id === "string" && t.name !== "Podcasts");
  if (isRecord(firstTag) && typeof firstTag.id === "string") {
    const gParams = { "filter.type": "urn:entity:podcast", "signal.interests.entities": workId, "signal.interests.tags": firstTag.id, take: "10" };
    out.push(check("podcasts with a tag signal", "/v2/insights", gParams, await probe(o, "/v2/insights", gParams), "entities", [
      { path: "results.entities[].entity_id", required: false },
    ], (p, n) => ok200(p) && (n ?? 0) > 0));
  }
  return out;
}

export function formatReport(checks: SmokeCheck[], secrets: string[]): string {
  const lines: string[] = [];
  for (const c of checks) {
    lines.push(`${c.outcome.toUpperCase().padEnd(7)} ${c.name}`);
    lines.push(`  endpoint: ${c.endpoint}  params: ${c.paramKeys.join(", ") || "-"}`);
    lines.push(`  http: ${c.httpStatus ?? "no response"}  results: ${c.resultCount ?? "n/a"}`);
    if (Object.keys(c.rateLimit).length) lines.push(`  rate-limit headers: ${Object.entries(c.rateLimit).map(([k, v]) => `${k}=${v}`).join(" ")}`);
    if (c.fieldPaths.length) lines.push(`  field paths: ${c.fieldPaths.slice(0, 30).join(" | ")}`);
    for (const x of c.expectations) lines.push(`  expect ${x.required ? "(required)" : "(optional)"} ${x.path}: ${x.present ? "present" : "MISSING"}`);
    if (c.note) lines.push(`  note: ${c.note}`);
  }
  const failed = checks.filter((c) => c.outcome === "fail").length;
  const skip = checks.filter((c) => c.outcome === "skipped").length;
  lines.push(`\nvalidation: ${failed === 0 ? "pass" : "FAIL"} (${checks.length - failed - skip} pass, ${failed} fail, ${skip} skipped)`);
  return redact(lines.join("\n"), secrets);
}
