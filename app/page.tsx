"use client";
import { useState } from "react";

type Show = { id: string; name: string; affinity: number; popularity: number; tie: boolean };
type Result = { status: string; mode: string; data: Show[] | null; error?: string; unresolved?: string[] };

const BADGE: Record<string, string> = {
  live: "LIVE · Qloo data",
  sample: "SAMPLE · Not Qloo data — live key pending",
};

export default function Home() {
  const [work, setWork] = useState("");
  const [seeds, setSeeds] = useState("");
  const [reach, setReach] = useState("stretch");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);

  async function run() {
    setBusy(true);
    try {
      const r = await fetch("/api/run", {
        method: "POST",
        body: JSON.stringify({ work, seeds: seeds.split(",").map((s) => s.trim()).filter(Boolean), reach }),
      });
      setRes(await r.json());
    } catch {
      setRes({ status: "failed", mode: "", data: null, error: "network" });
    }
    setBusy(false);
  }

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1>GREEN ROOM</h1>
      <p>Find the podcasts whose listeners already love your guest&apos;s work.</p>
      <label>Your guest&apos;s work<input value={work} onChange={(e) => setWork(e.target.value)} style={{ display: "block", width: "100%" }} /></label>
      <label>Up to 3 things your ideal listener loves (comma-separated)<input value={seeds} onChange={(e) => setSeeds(e.target.value)} style={{ display: "block", width: "100%" }} /></label>
      <p>
        {["reachable", "stretch", "dream"].map((r) => (
          <label key={r} style={{ marginRight: 12 }}>
            <input type="radio" checked={reach === r} onChange={() => setReach(r)} /> {r}
          </label>
        ))}
      </p>
      <button onClick={run} disabled={busy || !work.trim()}>{busy ? "Asking Qloo…" : "Build my booking list"}</button>

      {res && (
        <section style={{ marginTop: 24 }}>
          {res.mode && <p><strong>{BADGE[res.mode]}</strong></p>}
          {res.unresolved && <p>Qloo doesn&apos;t know: {res.unresolved.join(", ")}.</p>}
          {res.status === "degraded" && <p>We couldn&apos;t reach Qloo just now. We won&apos;t guess.</p>}
          {res.status === "empty" && !res.unresolved && <p>Qloo found no podcasts for this mix. Try fewer seeds or a bigger show size.</p>}
          {res.data?.map((s) => (
            <article key={s.id} style={{ borderTop: "1px solid #ccc", padding: "8px 0" }}>
              <h3 style={{ margin: 0 }}>{s.name}</h3>
              <small>Audience overlap {s.affinity.toFixed(2)}{s.tie ? " · within 0.05 of a neighbor: treat as a tie" : ""}</small>
            </article>
          ))}
          <p><small>Qloo results describe aggregate audience affinities, not any individual.</small></p>
        </section>
      )}
    </main>
  );
}
