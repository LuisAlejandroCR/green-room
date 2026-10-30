// guard.ts: per-IP and global limits for the routes that spend Qloo requests. Limits protect the hackathon quota:
// a run costs up to 8 Qloo requests, a show detail up to 8 (typically 2).
import { clientIp, createLimiter, type Limiter } from "./rate-limit.ts";

export type Bucket = "run" | "show";

const MINUTE = 60_000;
const CONFIG: Record<Bucket, { perIp: number; global: number }> = {
  run: { perIp: 6, global: 40 },
  show: { perIp: 20, global: 120 },
};

interface Limiters {
  perIp: Limiter;
  global: Limiter;
}

const store = globalThis as unknown as { __grLimiters?: Record<Bucket, Limiters> };

function limiters(): Record<Bucket, Limiters> {
  store.__grLimiters ??= (["run", "show"] as const).reduce((acc, b) => {
    acc[b] = {
      perIp: createLimiter({ limit: CONFIG[b].perIp, windowMs: MINUTE }),
      global: createLimiter({ limit: CONFIG[b].global, windowMs: MINUTE, maxKeys: 1 }),
    };
    return acc;
  }, {} as Record<Bucket, Limiters>);
  return store.__grLimiters;
}

export interface Limited {
  state: "rate_limited";
  error: "rate_limited";
  retryAfterSeconds: number;
}

/** Returns a typed 429 Response when the request must not proceed, else null. No Qloo request is made when limited. */
export function limitRequest(req: Request, bucket: Bucket, set: Record<Bucket, Limiters> = limiters()): Response | null {
  const ip = set[bucket].perIp.check(clientIp(req.headers));
  const all = ip.ok ? set[bucket].global.check("all") : { ok: true, retryAfterSeconds: 0 };
  if (ip.ok && all.ok) return null;
  const retryAfterSeconds = Math.max(ip.retryAfterSeconds, all.retryAfterSeconds, 1);
  const body: Limited = { state: "rate_limited", error: "rate_limited", retryAfterSeconds };
  return Response.json(body, { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } });
}

export function makeLimiters(cfg: Record<Bucket, { perIp: number; global: number }>, now?: () => number): Record<Bucket, Limiters> {
  const mk = (b: Bucket): Limiters => ({
    perIp: createLimiter({ limit: cfg[b].perIp, windowMs: MINUTE, now }),
    global: createLimiter({ limit: cfg[b].global, windowMs: MINUTE, maxKeys: 1, now }),
  });
  return { run: mk("run"), show: mk("show") };
}
