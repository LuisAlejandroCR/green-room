// use-green-room.ts: one state machine shared by the desktop and the mobile layouts: brief -> confirm -> matches ->
// receipt -> pitch, plus the demo brief and matches saved on this device. Rendering lives in desktop.tsx / mobile.tsx.
"use client";

import { useEffect, useMemo, useState } from "react";
import { DEMO_BRIEF } from "@/lib/demo";
import { draftPitch } from "@/lib/pitch";
import { adaptRun } from "@/lib/ui/adapt";
import type { UiCandidate, UiRun, UiShow } from "@/lib/ui/types";
import { themesOf, useEnrichment } from "./use-enrichment";

const SAVED_KEY = "green-room:saved:v1";

export const parseSeeds = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 3);

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
  const [busy, setBusy] = useState(false);
  const [run, setRun] = useState<UiRun | null>(null);
  const [brief, setBrief] = useState<{ work: string; seeds: string[]; confirmed: Record<string, string>; demo: boolean } | null>(null);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<Record<string, UiCandidate>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pitches, setPitches] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<UiShow[]>([]);

  useEffect(() => setSaved(readSaved()), []);
  const persist = (next: UiShow[]) => {
    setSaved(next);
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)); } catch { /* private mode: keep in memory */ }
  };

  const shows = useMemo(() => [...(run?.shows ?? [])].sort((a, b) => (b.overlap ?? -1) - (a.overlap ?? -1)), [run]);
  const selected = shows.find((s) => s.id === selectedId) ?? saved.find((s) => s.id === selectedId) ?? null;
  // Shared themes compare the work with the show; only meaningful for a show from the current run.
  const enrichment = useEnrichment(selected, selected && shows.includes(selected) ? (run?.workId ?? null) : null);

  async function post(body: { work: string; seeds: string[]; confirmed: Record<string, string> }, demo = false) {
    setBusy(true);
    setSelectedId(null);
    setBrief({ ...body, demo });
    try {
      const res = await fetch("/api/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      setRun(adaptRun(await res.json()));
    } catch {
      setRun(adaptRun({ error: "network" }));
    } finally {
      setBusy(false);
    }
  }

  const submit = () => {
    if (!work.trim() || busy) return;
    setChoices({});
    setPicked({});
    void post({ work: work.trim(), seeds: parseSeeds(seeds), confirmed: {} });
  };

  const demo = () => {
    if (busy) return;
    setWork(DEMO_BRIEF.work);
    setSeeds(DEMO_BRIEF.seeds.join(", "));
    setChoices({});
    setPicked({});
    void post(DEMO_BRIEF, true);
  };

  const choose = (name: string, option: UiCandidate) => {
    setChoices((c) => ({ ...c, [name]: option.id }));
    setPicked((p) => ({ ...p, [name]: option }));
  };

  const confirm = () => {
    if (!brief || !run) return;
    const confirmed = { ...brief.confirmed };
    for (const r of run.resolved) confirmed[r.name] = r.id;
    for (const g of run.candidates) if (choices[g.name]) confirmed[g.name] = choices[g.name];
    void post({ work: brief.work, seeds: brief.seeds, confirmed }, brief.demo);
  };

  const cancel = () => setRun((r) => (r ? { ...r, state: "cancelled", candidates: [] } : r));
  const reset = () => { setRun(null); setBrief(null); setSelectedId(null); };

  const isSaved = (id: string) => saved.some((s) => s.id === id);
  const toggleSave = (show: UiShow) => persist(isSaved(show.id) ? saved.filter((s) => s.id !== show.id) : [show, ...saved].slice(0, 50));

  const themes = themesOf(enrichment);
  const pitchFor = (show: UiShow) =>
    pitches[show.id] ?? draftPitch(brief?.work || work || "my guest's work", show.name, show.id === selected?.id ? themes : [], show.topics);
  const setPitch = (id: string, text: string) => setPitches((p) => ({ ...p, [id]: text }));

  const ready = !!run && run.candidates.length > 0 && run.candidates.every((g) => choices[g.name]);
  const workCover = brief ? picked[brief.work]?.image : undefined;

  return {
    work, setWork, seeds, setSeeds, busy, run, brief, shows, selected, selectedId, setSelectedId, enrichment, themes,
    choices, choose, ready, confirm, cancel, reset, submit, demo,
    saved, isSaved, toggleSave, pitchFor, setPitch, workCover,
  };
}

export type GreenRoom = ReturnType<typeof useGreenRoom>;
