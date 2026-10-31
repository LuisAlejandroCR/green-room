// mobile.tsx: the phone product (<1024px): choose and explore fast, one decision per screen. Start (example or your
// work) -> optional fans-also-love step with Qloo tag chips -> card deck (swipe right saves, left skips, tap for 3
// facts, every gesture has a button) -> "Your 3 picks" with a one-tap pitch and Web Share. No technical figures:
// only fit 0-100 and "Real data from Qloo". The Expo Android app (android-app/) mirrors this flow natively.
"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Copy, Heart, History, Info, Search, Share2, Sparkles, X } from "lucide-react";
import { LeafMark } from "./art";
import { CandidateBadgeTag } from "./candidate-badge";
import { Cover, FitRing, vibeOf } from "./cover";
import type { GreenRoom, TagSignal } from "./use-green-room";
import { candidateBadge, pickHint } from "@/lib/ui/candidates";
import type { UiRun, UiShow } from "@/lib/ui/types";
import { cn } from "@/lib/utils";

const GOAL = 3;
const buzz = () => { try { navigator.vibrate?.(12); } catch { /* not supported */ } };

/** One plain line about the show: the first sentence of Qloo's description, else its channel. */
export function plainLine(show: UiShow): string | undefined {
  const first = show.description?.split(/(?<=[.!?])\s/)[0];
  if (first) return first.length > 110 ? `${first.slice(0, 107).trimEnd()}…` : first;
  return show.channel ? `From ${show.channel}` : undefined;
}

export function MobileApp({ g }: { g: GreenRoom }) {
  const [step, setStep] = useState<"start" | "seeds">("start");
  const [decided, setDecided] = useState<Set<string>>(new Set());
  const [kept, setKept] = useState<UiShow[]>([]);
  const [showPicks, setShowPicks] = useState(false);

  // A new answer starts a fresh deck.
  useEffect(() => { setDecided(new Set()); setKept([]); setShowPicks(false); window.scrollTo({ top: 0 }); }, [g.run]);

  const deck = g.shows.filter((s) => !decided.has(s.id));
  const decide = (show: UiShow, keep: boolean) => {
    buzz();
    setDecided((d) => new Set(d).add(show.id));
    if (keep) {
      g.save(show);
      setKept((k) => {
        const next = [...k, show];
        if (next.length >= GOAL) setTimeout(() => setShowPicks(true), 250);
        return next;
      });
    }
  };
  const restart = () => { g.reset(); setStep("start"); };

  let screen: React.ReactNode;
  if (g.busy) screen = <Listening work={g.brief?.work ?? g.work} />;
  else if (g.run?.state === "needs_confirmation") screen = <PickScreen g={g} />;
  else if (g.run && g.shows.length && (g.run.state === "ok" || g.run.state === "partial")) {
    screen = showPicks || deck.length === 0
      ? <PicksScreen g={g} kept={kept} canSwipe={deck.length > 0} onMore={() => setShowPicks(false)} onRestart={restart} />
      : <DeckScreen g={g} deck={deck} kept={kept.length} onDecide={decide} onRestart={restart} onPicks={() => setShowPicks(true)} />;
  } else if (step === "seeds") screen = <SeedsScreen g={g} onBack={() => setStep("start")} />;
  else screen = <StartScreen g={g} onNext={() => setStep("seeds")} />;

  return <div className="min-h-dvh overflow-x-clip bg-paper pb-[env(safe-area-inset-bottom)]">{screen}</div>;
}

// ---------- Start

function StartScreen({ g, onNext }: { g: GreenRoom; onNext: () => void }) {
  return (
    <main className="px-4 pt-5 pb-10">
      <header className="rise flex items-center gap-2">
        <LeafMark className="size-7 text-primary" />
        <span className="font-display text-2xl font-semibold">Green Room</span>
      </header>
      <h1 className="rise headline mt-8 text-[2.5rem]" style={{ "--i": 1 } as React.CSSProperties}>
        Get on the podcasts your fans <em className="text-coral-ink">already love.</em>
      </h1>
      <p className="rise mt-3 text-lg text-muted-foreground" style={{ "--i": 2 } as React.CSSProperties}>Swipe through real matches. Keep three.</p>
      <PlainNotice run={g.run} />
      <button
        type="button" onClick={g.demo}
        className="rise relative mt-6 flex min-h-16 w-full items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-[#b8432c] via-[#8a4a00] to-[#6b3a7a] px-5 py-3 text-left text-white transition-transform active:scale-[0.98]"
        style={{ "--i": 3 } as React.CSSProperties}
      >
        <span aria-hidden="true" className="shine absolute inset-0" />
        <Sparkles className="relative size-6 shrink-0" aria-hidden="true" />
        <span className="relative">
          <span className="block text-lg font-semibold leading-tight">See a real example</span>
          <span className="block text-sm text-white/90">Atomic Habits · live results</span>
        </span>
      </button>
      <form className="rise mt-6 space-y-3" style={{ "--i": 4 } as React.CSSProperties} onSubmit={(e) => { e.preventDefault(); if (g.work.trim()) onNext(); }}>
        <label htmlFor="m-work" className="block text-base font-semibold">Or start with your book, film or brand</label>
        <input id="m-work" value={g.work} onChange={(e) => g.setWork(e.target.value)} placeholder="e.g. Atomic Habits" autoComplete="off" maxLength={200}
          className="block h-14 w-full rounded-2xl border-2 border-input bg-card px-4 text-lg placeholder:text-muted-foreground/80 focus:border-primary focus:outline-none" />
        <button type="submit" disabled={!g.work.trim()} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-lg font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-50">
          Next
        </button>
      </form>
      {g.health?.tour_present && (
        <button type="button" onClick={g.tour} className="mt-4 flex h-12 w-full items-center justify-center gap-2 text-base font-semibold text-muted-foreground">
          <History className="size-5" aria-hidden="true" /> Take the recorded tour
        </button>
      )}
    </main>
  );
}

// ---------- Optional seeds, with Qloo tag suggestions

function SeedsScreen({ g, onBack }: { g: GreenRoom; onBack: () => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<TagSignal[]>([]);
  useEffect(() => {
    const term = q.trim();
    if (term.length < 3) return setHits([]);
    const t = setTimeout(() => {
      fetch(`/api/tags?q=${encodeURIComponent(term)}`).then((r) => r.json())
        .then((j) => setHits(j?.tags?.status === "ok" && Array.isArray(j.tags.data) ? j.tags.data.slice(0, 8) : []))
        .catch(() => setHits([]));
    }, 350);
    return () => clearTimeout(t);
  }, [q]);
  const has = (t: TagSignal) => g.tags.some((x) => x.id === t.id);
  const toggle = (t: TagSignal) => g.setTags(has(t) ? g.tags.filter((x) => x.id !== t.id) : [...g.tags, t].slice(0, 3));
  return (
    <main className="px-4 pt-4 pb-40">
      <button type="button" onClick={onBack} aria-label="Back" className="grid size-11 place-items-center rounded-full bg-card"><ArrowLeft className="size-6" aria-hidden="true" /></button>
      <h1 className="headline mt-4 text-4xl">What else do your fans love?</h1>
      <p className="mt-2 text-lg text-muted-foreground">Optional. It sharpens the matches for <strong className="text-foreground">{g.work}</strong>.</p>
      <PlainNotice run={g.run} />
      <label htmlFor="m-seeds" className="mt-6 block text-base font-semibold">Brands, artists or books</label>
      <input id="m-seeds" value={g.seeds} onChange={(e) => g.setSeeds(e.target.value)} placeholder="e.g. Nike, Radiohead" autoComplete="off" maxLength={200}
        className="mt-1.5 block h-14 w-full rounded-2xl border-2 border-input bg-card px-4 text-lg focus:border-primary focus:outline-none" />
      <label htmlFor="m-vibe" className="mt-6 block text-base font-semibold">Or a vibe</label>
      <input id="m-vibe" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. fitness, mindfulness" autoComplete="off" maxLength={60}
        className="mt-1.5 block h-14 w-full rounded-2xl border-2 border-input bg-card px-4 text-lg focus:border-primary focus:outline-none" />
      {(hits.length > 0 || g.tags.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Suggested vibes from Qloo">
          {[...g.tags, ...hits.filter((h) => !has(h))].map((t) => (
            <button key={t.id} type="button" aria-pressed={has(t)} onClick={() => toggle(t)}
              className={cn("min-h-11 rounded-full px-4 text-base font-semibold", has(t) ? "bg-primary text-primary-foreground" : "bg-card ring-1 ring-line")}>
              {has(t) && <Check className="mr-1 inline size-4" aria-hidden="true" />}{t.name}
            </button>
          ))}
        </div>
      )}
      <div className="fixed inset-x-0 bottom-0 z-20 space-y-2 bg-paper/95 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 backdrop-blur">
        <button type="button" onClick={() => g.submit()} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-lg font-semibold text-primary-foreground active:scale-[0.98]">
          <Search className="size-5" aria-hidden="true" /> Find podcasts
        </button>
        <button type="button" onClick={() => { g.setSeeds(""); g.setTags([]); g.submit({ seeds: "", tags: [] }); }} className="h-11 w-full text-base font-semibold text-muted-foreground">Skip</button>
      </div>
    </main>
  );
}

function PlainNotice({ run }: { run: UiRun | null }) {
  if (!run) return null;
  const msg = (() => {
    switch (run.state) {
      case "cancelled": return "Search cancelled.";
      case "unresolved": return run.note === "confirmed_id_not_verified" ? "We couldn't confirm that pick. Try again." : `We couldn't find ${run.unresolved.map((n) => `"${n}"`).join(", ")}. Try another name.`;
      case "degraded":
        return run.note === "seed_not_usable" ? "We can't find podcasts from those picks. Try a different version, or other names." : "We couldn't get results right now. Nothing was made up. Try again.";
      case "malformed":
      case "failed": return run.note === "tour_unavailable" ? "The recorded tour isn't available here." : "Something went wrong. Nothing was made up. Try again.";
      case "rate_limited": return `Lots of searches right now. Try again in ${run.retryAfterSeconds ?? 60} seconds.`;
      case "empty": return "No podcasts found for this mix. Try other names.";
      default: return null;
    }
  })();
  return msg ? <p role="status" className="pop mt-5 rounded-2xl bg-alert-soft p-4 text-base font-semibold text-alert">{msg}</p> : null;
}

// ---------- Loading

const TIPS = ["Finding your fans…", "Listening to what they love…", "Dealing your cards…"];

function Listening({ work }: { work: string }) {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((n) => (n + 1) % TIPS.length), 1400); return () => clearInterval(t); }, []);
  const colors = ["#e8b04a", "#f08a5d", "#5cc1b8", "#c08ad6", "#7fa8ec", "#8fae9a"];
  return (
    <main role="status" aria-live="polite" className="fixed inset-0 z-40 grid place-items-center bg-gradient-to-b from-[#17402f] to-[#0f2a20] px-6 text-center text-on-dark">
      <div>
        <div aria-hidden="true" className="mx-auto flex h-28 items-end justify-center gap-2">
          {Array.from({ length: 9 }, (_, n) => (
            <span key={n} className="eq-bar w-4 rounded-full" style={{ height: `${50 + ((n * 29) % 50)}%`, background: colors[n % colors.length], "--i": n } as React.CSSProperties} />
          ))}
        </div>
        <p className="mt-8 font-display text-3xl">{TIPS[i]}</p>
        {work && <p className="mt-2 text-lg text-on-dark-muted">for {work}</p>}
      </div>
    </main>
  );
}

// ---------- Pick (only when a name matches several things)

function PickScreen({ g }: { g: GreenRoom }) {
  const run = g.run!;
  return (
    <main className="px-4 pb-36 pt-5">
      <h1 className="rise headline text-4xl">Which one did you mean?</h1>
      <p className="rise mt-2 text-lg text-muted-foreground" style={{ "--i": 1 } as React.CSSProperties}>Tap the right one. We never guess for you.</p>
      {run.candidates.map((group, gi) => (
        <section key={group.name} className="mt-7">
          <h2 className="rise text-xl font-semibold" style={{ "--i": gi + 2 } as React.CSSProperties}>&ldquo;{group.name}&rdquo;</h2>
          <div role="radiogroup" aria-label={`Matches for ${group.name}`} className="no-scrollbar -mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
            {group.options.map((o, oi) => {
              const on = g.choices[group.name] === o.id;
              const badge = candidateBadge(oi, o.id, g.suggestions[group.name]);
              return (
                <button key={o.id} type="button" role="radio" aria-checked={on} onClick={() => g.choose(group.name, o)}
                  className={cn("pop relative w-36 shrink-0 snap-start rounded-2xl bg-card p-2 text-left transition-all", on ? "ring-4 ring-primary" : "ring-1 ring-line")}
                  style={{ "--i": oi } as React.CSSProperties}>
                  <Cover src={o.image} seed={o.id} alt="" className="aspect-[3/4] w-full" rounded="rounded-xl" />
                  {on && <span className="pop absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="size-5" aria-hidden="true" /></span>}
                  <CandidateBadgeTag badge={badge} className="text-[11px]" />
                  <span className="mt-2 line-clamp-3 text-sm font-semibold leading-snug">{o.name}</span>
                  {(o.kind || o.detail) && <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{[o.kind, o.detail].filter(Boolean).join(" · ")}</span>}
                </button>
              );
            })}
          </div>
        </section>
      ))}
      <div className="fixed inset-x-0 bottom-0 z-20 space-y-2 bg-paper/95 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 backdrop-blur">
        {!g.ready && <p role="status" className="text-center text-sm text-muted-foreground">{pickHint(run.candidates, g.choices)}</p>}
        <button type="button" disabled={!g.ready} onClick={g.confirm} className="flex h-14 w-full items-center justify-center rounded-2xl bg-primary text-lg font-semibold text-primary-foreground active:scale-[0.98] disabled:opacity-50">Show my podcasts</button>
        <button type="button" onClick={g.cancel} className="h-11 w-full text-base font-semibold text-muted-foreground">Cancel</button>
      </div>
    </main>
  );
}

// ---------- Deck

function DataFoot({ run }: { run: UiRun }) {
  const text = run.mode === "sample" ? "SAMPLE · Not Qloo data" : run.mode === "recorded" ? `Recorded real data from Qloo${run.recordedAt ? ` · ${run.recordedAt.slice(0, 10)}` : ""}` : "Real data from Qloo";
  return <p className="text-center text-xs font-semibold text-muted-foreground">{text}</p>;
}

function DeckScreen({ g, deck, kept, onDecide, onRestart, onPicks }: {
  g: GreenRoom; deck: UiShow[]; kept: number; onDecide: (s: UiShow, keep: boolean) => void; onRestart: () => void; onPicks: () => void;
}) {
  const top = deck[0];
  const [dx, setDx] = useState(0);
  const [info, setInfo] = useState(false);
  const [leaving, setLeaving] = useState<0 | 1 | -1>(0);
  const start = useRef<{ x: number; moved: boolean } | null>(null);
  const work = g.brief?.work ?? g.work;

  useEffect(() => { setDx(0); setInfo(false); setLeaving(0); }, [top?.id]);
  const commit = (keep: boolean) => {
    setLeaving(keep ? 1 : -1);
    setTimeout(() => onDecide(top, keep), 180);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") commit(true);
      else if (e.key === "ArrowLeft") commit(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const v = vibeOf(top.id);
  const offset = leaving ? leaving * 600 : dx;
  const hint = dx > 40 ? "keep" : dx < -40 ? "skip" : null;
  return (
    <main className="flex min-h-dvh flex-col px-4 pt-4 pb-4">
      <header className="flex items-center justify-between gap-3">
        <button type="button" onClick={onRestart} aria-label="New search" className="grid size-11 place-items-center rounded-full bg-card"><ArrowLeft className="size-6" aria-hidden="true" /></button>
        <p className="min-w-0 flex-1 truncate text-center text-base font-semibold">For fans of {work}</p>
        <button type="button" onClick={onPicks} className="flex h-11 items-center gap-1.5 rounded-full bg-card px-3 text-base font-semibold text-coral-ink" aria-label={`${kept} of ${GOAL} picks kept. See picks`}>
          <Heart className="size-5 fill-current" aria-hidden="true" />{kept}/{GOAL}
        </button>
      </header>
      <p className="mt-2 text-center text-sm text-muted-foreground" aria-live="polite">{deck.length} left · swipe right to keep, left to skip</p>

      <div className="relative mt-3 min-h-[26rem] flex-1">
        {deck[1] && <div aria-hidden="true" className="absolute inset-x-3 top-3 bottom-0 rounded-3xl" style={{ background: vibeOf(deck[1].id).fill, opacity: 0.45 }} />}
        <article
          aria-label={`${top.name}. Fit ${top.overlap !== undefined ? Math.round(top.overlap * 100) : "not available"} out of 100.`}
          className="absolute inset-0 touch-pan-y select-none overflow-hidden rounded-3xl text-white shadow-[0_18px_40px_-18px_rgb(15_42_32/0.6)]"
          style={{ background: v.fill, transform: `translateX(${offset}px) rotate(${offset / 22}deg)`, transition: start.current ? "none" : "transform 180ms ease-out" }}
          onPointerDown={(e) => { start.current = { x: e.clientX, moved: false }; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); }}
          onPointerMove={(e) => { if (!start.current) return; const d = e.clientX - start.current.x; if (Math.abs(d) > 6) start.current.moved = true; setDx(d); }}
          onPointerUp={() => {
            const s = start.current;
            start.current = null;
            if (!s) return;
            if (dx > 100) commit(true);
            else if (dx < -100) commit(false);
            else { setDx(0); if (!s.moved) setInfo((x) => !x); }
          }}
          onPointerCancel={() => { start.current = null; setDx(0); }}
        >
          <div className="relative h-[58%]">
            <Cover src={top.image} seed={top.id} alt="" className="absolute inset-0 size-full" rounded="rounded-none" />
            <span aria-hidden="true" className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 45%, ${v.fill} 98%)` }} />
            {hint && <span className={cn("absolute top-5 rounded-xl border-4 px-3 py-1 text-2xl font-bold uppercase", hint === "keep" ? "left-5 -rotate-12 border-white text-white" : "right-5 rotate-12 border-white/90 text-white/90")}>{hint}</span>}
          </div>
          <div className="relative -mt-10 px-5 pb-5">
            <div className="flex items-end gap-3">
              <h2 className="min-w-0 flex-1 font-display text-[1.75rem] font-semibold leading-tight">{top.name}</h2>
              <span className="rounded-full bg-white/15 p-1"><FitRing value={top.overlap} size={60} stroke="#ffffff" track="rgb(255 255 255 / 0.25)" hundred /></span>
            </div>
            {info ? (
              <dl className="mt-3 space-y-2 text-base">
                <div><dt className="text-sm text-white/80">Fit</dt><dd className="font-semibold">{top.overlap !== undefined ? `${Math.round(top.overlap * 100)} out of 100 · how well it matches your fans' taste` : "Not available"}</dd></div>
                <div><dt className="text-sm text-white/80">Known for</dt><dd className="font-semibold">{top.topics?.slice(0, 3).join(", ") || "No topics yet"}</dd></div>
                <div><dt className="text-sm text-white/80">About</dt><dd className="line-clamp-3">{plainLine(top) ?? "No description yet"}</dd></div>
              </dl>
            ) : (
              <>
                {plainLine(top) && <p className="mt-2 line-clamp-2 text-base text-white/90">{plainLine(top)}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {(top.topics ?? []).slice(0, 2).map((t, i) => {
                    const id = top.topicIds?.[i];
                    return (
                      <button key={t} type="button" disabled={!id || g.brief?.tour} onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}
                        onClick={() => id && g.moreLike({ id, name: t })} className="min-h-11 rounded-full bg-white/20 px-4 text-sm font-semibold disabled:opacity-80"
                        aria-label={id && !g.brief?.tour ? `More like this: ${t}` : t}>
                        {t}{id && !g.brief?.tour && <span aria-hidden="true"> +</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </article>
      </div>

      <div className="mt-4 grid grid-cols-3 items-center gap-3">
        <button type="button" onClick={() => commit(false)} aria-label={`Skip ${top.name}`} className="mx-auto grid size-16 place-items-center rounded-full bg-card text-foreground shadow-md active:scale-95"><X className="size-8" aria-hidden="true" /></button>
        <button type="button" onClick={() => setInfo((x) => !x)} aria-pressed={info} aria-label={`About ${top.name}`} className="mx-auto grid size-12 place-items-center rounded-full bg-card text-foreground shadow-md active:scale-95"><Info className="size-6" aria-hidden="true" /></button>
        <button type="button" onClick={() => commit(true)} aria-label={`Keep ${top.name}`} className="mx-auto grid size-16 place-items-center rounded-full bg-[#b8432c] text-white shadow-md active:scale-95"><Heart className="size-8" aria-hidden="true" /></button>
      </div>
      <div className="mt-3"><DataFoot run={g.run!} /></div>
    </main>
  );
}

// ---------- Picks

function PicksScreen({ g, kept, canSwipe, onMore, onRestart }: { g: GreenRoom; kept: UiShow[]; canSwipe: boolean; onMore: () => void; onRestart: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (s: UiShow) => {
    try { await navigator.clipboard.writeText(g.pitchFor(s)); setCopied(s.id); buzz(); setTimeout(() => setCopied(null), 1800); } catch { /* clipboard blocked */ }
  };
  const share = async (s: UiShow) => {
    const url = `https://podcasts.apple.com/search?term=${encodeURIComponent(s.name)}`;
    try {
      if (navigator.share) await navigator.share({ title: s.name, text: s.name, url });
      else { await navigator.clipboard.writeText(`${s.name} ${url}`); setCopied(`share:${s.id}`); setTimeout(() => setCopied(null), 1800); }
    } catch { /* share dismissed */ }
  };
  return (
    <main className="px-4 pt-6 pb-10">
      <h1 className="rise headline text-4xl">{kept.length >= GOAL ? `Your ${GOAL} picks` : kept.length ? `Your ${kept.length} pick${kept.length > 1 ? "s" : ""}` : "No picks yet"}</h1>
      <p className="mt-2 text-lg text-muted-foreground">{kept.length ? "Copy a ready pitch or share the show. We never send anything." : "Swipe right on a show to keep it."}</p>
      <ul className="mt-6 space-y-4">
        {kept.map((s, i) => (
          <li key={s.id} className="pop rounded-3xl bg-card p-3 shadow-[0_6px_24px_-14px_rgb(15_42_32/0.5)]" style={{ "--i": i } as React.CSSProperties}>
            <div className="flex items-center gap-3">
              <Cover src={s.image} seed={s.id} alt="" className="size-16" rounded="rounded-2xl" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-lg font-semibold leading-snug">{s.name}</p>
                <p className="text-sm text-muted-foreground">Fit {s.overlap !== undefined ? Math.round(s.overlap * 100) : "–"}/100</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => copy(s)} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground active:scale-[0.98]">
                {copied === s.id ? <Check className="size-5" aria-hidden="true" /> : <Copy className="size-5" aria-hidden="true" />}{copied === s.id ? "Copied" : "Copy pitch"}
              </button>
              <button type="button" onClick={() => share(s)} className="flex h-12 items-center justify-center gap-2 rounded-2xl border-2 border-primary text-base font-semibold text-primary active:scale-[0.98]">
                {copied === `share:${s.id}` ? <Check className="size-5" aria-hidden="true" /> : <Share2 className="size-5" aria-hidden="true" />}{copied === `share:${s.id}` ? "Link copied" : "Share"}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-muted-foreground">Read each pitch over and make it yours before you send it.</p>
      {canSwipe && <button type="button" onClick={onMore} className="mt-5 h-12 w-full rounded-2xl border-2 border-primary text-base font-semibold text-primary">Keep swiping</button>}
      <button type="button" onClick={onRestart} className="mt-3 h-12 w-full text-base font-semibold text-muted-foreground">New search</button>
      <div className="mt-4"><DataFoot run={g.run!} /></div>
    </main>
  );
}
