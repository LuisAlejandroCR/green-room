// rate-limit.ts: in-memory fixed-window limiter with no external service. Best-effort per server instance
// (serverless instances do not share memory), so it bounds Qloo spend per instance rather than globally.
// Fail-closed: when the key table is full of live windows, new keys are denied rather than tracked unboundedly.

export interface LimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

export interface Limiter {
  check(key: string): LimitResult;
}

export function createLimiter(opts: { limit: number; windowMs: number; maxKeys?: number; now?: () => number }): Limiter {
  const { limit, windowMs, maxKeys = 5000, now = Date.now } = opts;
  const windows = new Map<string, { start: number; count: number }>();

  function prune(t: number) {
    for (const [k, w] of windows) if (t - w.start >= windowMs) windows.delete(k);
  }

  return {
    check(key) {
      const t = now();
      let w = windows.get(key);
      if (w && t - w.start >= windowMs) {
        windows.delete(key);
        w = undefined;
      }
      if (!w) {
        if (windows.size >= maxKeys) prune(t);
        if (windows.size >= maxKeys) return { ok: false, retryAfterSeconds: Math.ceil(windowMs / 1000) };
        w = { start: t, count: 0 };
        windows.set(key, w);
      }
      if (w.count >= limit) return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((w.start + windowMs - t) / 1000)) };
      w.count += 1;
      return { ok: true, retryAfterSeconds: 0 };
    },
  };
}

/** One trusted proxy hop: prefer x-real-ip, else the LAST x-forwarded-for entry (the one our proxy appended).
 *  Unknown clients share one bucket, which fails closed. */
export function clientIp(headers: Headers): string {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const last = xff.split(",").pop()?.trim();
    if (last) return last.slice(0, 64);
  }
  return "unknown";
}
