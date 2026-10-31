// use-green-room.ts: one engine shared by the two products: the web campaign desk (desktop.tsx) and the phone swipe
// flow (mobile.tsx). Brief -> confirm -> matches, plus the demo brief, the RECORDED tour, tag signals ("more like
// this"), Claude's candidate suggestions, saved matches on this device and the Pitch Studio (Claude draft + JEV).
"use client";

import { useEffect, useMemo, useState } from "react";
import { DEMO_BRIEF } from "@/lib/demo";
import { draftPitch } from "@/lib/pitch";
import { adaptRun } from "@/lib/ui/adapt";
import type { UiCandidate, UiRun, UiShow } from "@/lib/ui/types";
import { themesOf, useEnrichment } from "./use-enrichment";

const SAVED_KEY = "green-room:saved:v1";

export const parseSeeds = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 3);

export interface TagSignal {
  id: string;
  name: string;
}

export interface Brief {
  work: string;
  seeds: string[];
  confirmed: Record<string, string>;
  demo: boolean;
  tour?: boolean;
  tags: TagSignal[];
}

export interface Health {
  mode: string;
  key_present: boolean;
  jev_key_present: boolean;
  agent_key_present: boolean;
  tour_present: boolean;
}

export interface ReviewReason { rule: string; value?: string | number }
export interface Review {
  decision: "editorial_check_passed" | "human_review" | "revise" | "blocked";
  reasons: ReviewReason[];
  answers: Record<string, number>;
  model?: string;
  checkedAt: string;
}
export type Author = { kind: "claude"; model: string } | { kind: "template"; reason: string; configured: boolean; model: string };
export interface Studio {
  status: "loading" | "ready" | "error";
  author?: Author;
  review?: Review;
  reviewing?: boolean;
  stale?: boolean; // edited since the last review
}

function readSaved(): UiShow[] {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((s) => s && typeof s.id === "string" && s.provenance) : [];
  } catch {
    return [];
  }
}

export function useGreenRoom() {
  const [work, setWork] = useState("");
  const [seeds, setSeeds] = useState("");
  const [tags, setTags] = useState<TagSignal[]>([]);
  const [busy, setBusy] = useState(false);
  const [run, setRun] = useState<UiRun | null>(null);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<Record<string, UiCandidate>>({});
  const [suggestions, setSuggestions] = useState<Record<string, string | null>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pitches, setPitches] = useState<Record<string, string>>({});
  const [studio, setStudio] = useState<Record<string, Studio>>({});
  const [saved, setSaved] = useState<UiShow[]>([]);
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => setSaved(readSaved()), []);
  useEffect(() => {
    fetch("/api/health").then((r) => r.json()).then(setHealth).catch(() => setHealth(null));
  }, []);
  const persist = (next: UiShow[]) => {
    setSaved(next);
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)); } catch { /* private mode: keep in memory */ }
  };

  const shows = useMemo(() => [...(run?.shows ?? [])].sort((a, b) => (b.overlap ?? -1) - (a.overlap ?? -1)), [run]);
  const selected = shows.find((s) => s.id === selectedId) ?? saved.find((s) => s.id === selectedId) ?? null;
  // Shared themes compare the work with the show; only meaningful for a show from the current run.
  const enrichment = useEnrichment(selected, selected && shows.includes(selected) ? (run?.workId ?? null) : null);

  async function post(body: { work: string; seeds: string[]; confirmed: Record<string, string> }, demo = false, tagList: TagSignal[] = []) {
    setBusy(true);
    setSelectedId(null);
    setSuggestions({});
    setBrief({ ...body, demo, tags: tagList });
    try {
      const res = await fetch("/api/run", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...body, tags: tagList.map((t) => t.id) }),
      });
      const next = adaptRun(await res.json());
      setRun(next);
      if (next.state === "needs_confirmation") void suggest(next, body);
    } catch {
      setRun(adaptRun({ error: "network" }));
    } finally {
      setBusy(false);
    }
  }

  // Claude's hint for each ambiguous name (call 1 of 2). Shown as a suggestion; the person still picks.
  async function suggest(r: UiRun, body: { work: string; seeds: string[] }) {
    for (const g of r.candidates) {
      try {
        const res = await fetch("/api/suggest", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: g.name, context: [body.work, ...body.seeds].filter((n) => n !== g.name), options: g.options }),
        });
        const j = await res.json();
        if (j?.suggestion?.status === "ok") setSuggestions((s) => ({ ...s, [g.name]: j.suggestion.data }));
        else return; // unavailable or failed: no hint, nothing else changes
      } catch {
        return;
      }
    }
  }

  const submit = (override?: { seeds: string; tags: TagSignal[] }) => {
    if (!work.trim() || busy) return;
    setChoices({});
    setPicked({});
    void post({ work: work.trim(), seeds: parseSeeds(override?.seeds ?? seeds), confirmed: {} }, false, override?.tags ?? tags);
  };

  const demo = () => {
    if (busy) return;
    setWork(DEMO_BRIEF.work);
    setSeeds(DEMO_BRIEF.seeds.join(", "));
    setTags([]);
    setChoices({});
    setPicked({});
    void post(DEMO_BRIEF, true);
  };

  // The RECORDED tour: a real demo run captured earlier, labelled with its date. Never used when live fails.
  const tour = async () => {
    if (busy) return;
    setBusy(true);
    setSelectedId(null);
    setChoices({});
    setPicked({});
    setBrief({ ...DEMO_BRIEF, demo: true, tour: true, tags: [] });
    try {
      const res = await fetch("/api/tour");
      setRun(adaptRun(res.ok ? await res.json() : { error: "tour_unavailable" }));
    } catch {
      setRun(adaptRun({ error: "network" }));
    } finally {
      setBusy(false);
    }
  };

  /** Confirmed and resolved IDs of the current brief, so a re-run never asks again. */
  const currentConfirmed = () => {
    const confirmed = { ...(brief?.confirmed ?? {}) };
    for (const r of run?.resolved ?? []) confirmed[r.name] = r.id;
    return confirmed;
  };

  // "More like this": the same brief plus one of a show's own Qloo tags as a signal.
  const moreLike = (tag: TagSignal) => {
    if (!brief || busy || brief.tour) return;
    void post({ work: brief.work, seeds: brief.seeds, confirmed: currentConfirmed() }, brief.demo, [tag]);
  };

  const choose = (name: string, option: UiCandidate) => {
    setChoices((c) => ({ ...c, [name]: option.id }));
    setPicked((p) => ({ ...p, [name]: option }));
  };

  const confirm = () => {
    if (!brief || !run) return;
    const confirmed = currentConfirmed();
    for (const g of run.candidates) if (choices[g.name]) confirmed[g.name] = choices[g.name];
    void post({ work: brief.work, seeds: brief.seeds, confirmed }, brief.demo, brief.tags);
  };

  const cancel = () => setRun((r) => (r ? { ...r, state: "cancelled", candidates: [] } : r));
  const reset = () => { setRun(null); setBrief(null); setSelectedId(null); };

  const isSaved = (id: string) => saved.some((s) => s.id === id);
  const toggleSave = (show: UiShow) => persist(isSaved(show.id) ? saved.filter((s) => s.id !== show.id) : [show, ...saved].slice(0, 50));
  const save = (show: UiShow) => { if (!isSaved(show.id)) persist([show, ...saved].slice(0, 50)); };

  const themes = themesOf(enrichment);
  const workName = brief?.work || work || "my guest's work";
  const pitchFor = (show: UiShow) =>
    pitches[show.id] ?? draftPitch(workName, show.name, show.id === selected?.id ? themes : [], show.topics);
  const setPitch = (id: string, text: string) => {
    setPitches((p) => ({ ...p, [id]: text }));
    setStudio((s) => (s[id] ? { ...s, [id]: { ...s[id], stale: true } } : s));
  };

  const evidenceFor = (show: UiShow) => ({
    work: workName, show: show.name, showTopics: show.topics ?? [],
    sharedThemes: show.id === selected?.id ? themes : [], workTaste: (run?.taste ?? []).map((t) => t.name),
    sourceMode: show.mode,
  });

  // Pitch Studio: Claude drafts from Qloo evidence (call 2 of 2), JEV reviews; template when Claude is not set up.
  const draft = async (show: UiShow) => {
    setStudio((s) => ({ ...s, [show.id]: { status: "loading" } }));
    try {
      const res = await fetch("/api/pitch", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(evidenceFor(show)) });
      const j = await res.json();
      if (typeof j?.text !== "string") throw new Error("bad");
      setPitches((p) => ({ ...p, [show.id]: j.text }));
      setStudio((s) => ({ ...s, [show.id]: { status: "ready", author: j.author, review: j.review } }));
    } catch {
      setStudio((s) => ({ ...s, [show.id]: { status: "error" } }));
    }
  };

  const recheck = async (show: UiShow) => {
    setStudio((s) => ({ ...s, [show.id]: { ...(s[show.id] ?? { status: "ready" }), reviewing: true } }));
    try {
      const res = await fetch("/api/review", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...evidenceFor(show), text: pitchFor(show) }),
      });
      const j = await res.json();
      setStudio((s) => ({ ...s, [show.id]: { ...(s[show.id] ?? { status: "ready" }), review: j.review, reviewing: false, stale: false } }));
    } catch {
      setStudio((s) => ({ ...s, [show.id]: { ...(s[show.id] ?? { status: "ready" }), reviewing: false } }));
    }
  };

  const ready = !!run && run.candidates.length > 0 && run.candidates.every((g) => choices[g.name]);
  const workCover = brief ? picked[brief.work]?.image : undefined;

  return {
    work, setWork, seeds, setSeeds, tags, setTags, busy, run, brief, shows, selected, selectedId, setSelectedId, enrichment, themes,
    choices, choose, suggestions, ready, confirm, cancel, reset, submit, demo, tour, moreLike, health,
    saved, isSaved, toggleSave, save, pitchFor, setPitch, studio, draft, recheck, workCover,
  };
}

export type GreenRoom = ReturnType<typeof useGreenRoom>;
