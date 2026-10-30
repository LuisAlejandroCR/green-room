// helpers.ts: stub fetch and env for live-mode tests. No network is ever touched.
export type Responder = (url: URL) => { status?: number; body?: unknown; throws?: boolean; rawText?: string };

export function stubLive(responder: Responder) {
  process.env.QLOO_MODE = "live";
  process.env.QLOO_API_KEY = "test-key-not-real";
  const calls: URL[] = [];
  globalThis.fetch = (async (input: unknown) => {
    const url = new URL(String(input));
    calls.push(url);
    const r = responder(url);
    if (r.throws) throw new Error("network");
    const text = r.rawText ?? JSON.stringify(r.body ?? {});
    return new Response(text, { status: r.status ?? 200 });
  }) as typeof fetch;
  return calls;
}

export const entity = (id: string, name: string, extra: Record<string, unknown> = {}) => ({ entity_id: id, name, ...extra });
