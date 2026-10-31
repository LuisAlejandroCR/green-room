// mobile.tsx: the Android / phone experience. Straight to the point and jargon-free: Start, Pick, Matches, Why it fits,
// Pitch and Saved. Real Qloo covers and topics, colour per show, motion that stops under prefers-reduced-motion.
"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Check, Copy, Heart, Home, Search, Sparkles } from "lucide-react";
import { LeafMark } from "./art";
import { Cover, FitRing, vibeOf } from "./cover";
import type { GreenRoom } from "./use-green-room";
import type { EnrichmentState } from "./use-enrichment";
import type { UiRun, UiShow } from "@/lib/ui/types";
import { cn } from "@/lib/utils";

type Tab = "home" | "saved";
type Detail = null | "why" | "pitch";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};

export function MobileApp({ g }: { g: GreenRoom }) {
  const [tab, setTab] = useState<Tab>("home");
  const [detail, setDetail] = useState<Detail>(null);
  const [more, setMore] = useState(false);

  // Each new answer starts at the top of its screen.
  useEffect(() => { window.scrollTo({ top: 0 }); }, [g.run, tab, detail]);
  useEffect(() => { if (!g.selected) setDetail(null); }, [g.selected]);

  const open = (id: string) => { g.setSelectedId(id); setDetail("why"); };
  const back = () => { if (detail === "pitch") setDetail("why"); else { setDetail(null); g.setSelectedId(null); } };

  let screen: React.ReactNode;
  let nav = true;
  if (g.busy) { screen = <Listening work={g.brief?.work ?? g.work} />; nav = false; }
  else if (detail === "pitch" && g.selected) { screen = <PitchScreen g={g} show={g.selected} onBack={back} />; nav = false; }
  else if (detail === "why" && g.selected) { screen = <WhyScreen g={g} show={g.selected} onBack={back} onPitch={() => setDetail("pitch")} />; nav = false; }
  else if (tab === "saved") screen = <SavedScreen g={g} onOpen={open} onFind={() => setTab("home")} />;
  else if (g.run?.state === "needs_confirmation") { screen = <PickScreen g={g} />; nav = false; }
  else if (g.run && g.shows.length && (g.run.state === "ok" || g.run.state === "partial")) screen = <MatchesScreen g={g} onOpen={open} more={more} setMore={setMore} />;
  else screen = <StartScreen g={g} />;

  return (
    <div className="min-h-dvh overflow-x-clip bg-paper pb-[calc(env(safe-area-inset-bottom)+6rem)]">
      {screen}
      {nav && <BottomNav tab={tab} setTab={(t) => { setTab(t); setDetail(null); }} savedCount={g.saved.length} onHome={() => { if (tab === "home") g.reset(); }} />}
    </div>
  );
}

// ---------- Start

function StartScreen({ g }: { g: GreenRoom }) {
  return (
    <main className="px-4 pt-5">
      <header className="rise flex items-center gap-2">
        <LeafMark className="size-7 text-primary" />
        <span className="font-display text-2xl font-semibold">Green Room</span>
      </header>

      <Hero />

      <h1 className="rise headline mt-2 text-[2.5rem]" style={{ "--i": 1 } as React.CSSProperties}>
        Get on the podcasts your fans <em className="text-coral-ink">already love.</em>
      </h1>
      <p className="rise mt-3 text-lg text-muted-foreground" style={{ "--i": 2 } as React.CSSProperties}>
        Tell us what you made. We show you where its fans are listening.
      </p>

      <PlainNotice run={g.run} />

      <button
        type="button"
        onClick={g.demo}
        className="rise relative mt-5 flex min-h-16 w-full items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-[#b8432c] via-[#8a4a00] to-[#6b3a7a] px-5 py-3 text-left text-white transition-transform active:scale-[0.98]"
        style={{ "--i": 3 } as React.CSSProperties}
      >
        <span aria-hidden="true" className="shine absolute inset-0" />
        <Sparkles className="relative size-6 shrink-0" aria-hidden="true" />
        <span className="relative">
          <span className="block text-lg font-semibold leading-tight">See a real example</span>
          <span className="block text-sm text-white/90">Atomic Habits · live results</span>
        </span>
      </button>

      <p className="rise mt-6 text-center text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground" style={{ "--i": 4 } as React.CSSProperties}>or try yours</p>
      <form
        className="rise mt-3 space-y-4 rounded-3xl bg-card p-5 shadow-[0_10px_40px_-18px_rgb(15_42_32/0.45)]"
        style={{ "--i": 5 } as React.CSSProperties}
        onSubmit={(e) => { e.preventDefault(); g.submit(); }}
      >
        <Field id="m-work" label="Your book, film or brand" placeholder="e.g. Atomic Habits" value={g.work} onChange={g.setWork} />
        <Field id="m-seeds" label="Your fans also love (optional)" placeholder="e.g. Nike, Radiohead" value={g.seeds} onChange={g.setSeeds} />
        <button type="submit" disabled={!g.work.trim()} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-lg font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-50">
          <Search className="size-5" aria-hidden="true" /> Find podcasts
        </button>
      </form>
    </main>
  );
}

function Hero() {
  const blobs = [
    { c: "#e8b04a", s: "size-24", p: "left-[8%] top-6" },
    { c: "#b8432c", s: "size-16", p: "right-[14%] top-2" },
    { c: "#5cc1b8", s: "size-20", p: "right-[4%] top-20" },
    { c: "#c08ad6", s: "size-12", p: "left-[42%] top-16" },
    { c: "#7fa8ec", s: "size-10", p: "left-[24%] top-28" },
  ];
  return (
    <div aria-hidden="true" className="relative mt-4 h-32 overflow-hidden rounded-3xl bg-gradient-to-br from-[#17402f] to-[#0f2a20]">
      {blobs.map((b, i) => (
        <span key={i} className={cn("float absolute rounded-full opacity-90", b.s, b.p)} style={{ background: b.c, "--i": i } as React.CSSProperties} />
      ))}
      <div className="absolute inset-x-0 bottom-0 flex h-16 items-end justify-center gap-1.5 pb-4">
        {Array.from({ length: 18 }, (_, i) => (
          <span key={i} className="eq-bar w-2 rounded-full bg-paper/85" style={{ height: `${30 + ((i * 37) % 70)}%`, "--i": i } as React.CSSProperties} />
        ))}
      </div>
    </div>
  );
}

function Field({ id, label, placeholder, value, onChange }: { id: string; label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label htmlFor={id} className="block text-base font-semibold">{label}</label>
      <input
        id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete="off" maxLength={200}
        className="mt-1.5 block h-14 w-full rounded-2xl border-2 border-input bg-paper px-4 text-lg placeholder:text-muted-foreground/80 focus:border-primary focus:outline-none"
      />
    </div>
  );
}

/** Every non-success state in plain words. Nothing is invented when Qloo fails. */
function PlainNotice({ run }: { run: UiRun | null }) {
  if (!run) return null;
  const msg = (() => {
    switch (run.state) {
      case "cancelled": return "Search cancelled.";
      case "unresolved": return `We couldn't find ${run.unresolved.map((n) => `"${n}"`).join(", ")}. Try another name.`;
      case "degraded":
        return run.note === "seed_not_usable"
          ? "We can't find podcasts from those picks. Try a different version, or other names."
          : "We couldn't get results right now. Nothing was made up. Try again.";
      case "malformed":
      case "failed": return "Something went wrong. Nothing was made up. Try again.";
      case "rate_limited": return `Lots of searches right now. Try again in ${run.retryAfterSeconds ?? 60} seconds.`;
      case "empty": return "No podcasts found for this mix. Try other names.";
      default: return null;
    }
  })();
  return msg ? <p role="status" className="pop mt-5 rounded-2xl bg-alert-soft p-4 text-base font-semibold text-alert">{msg}</p> : null;
}

// ---------- Loading

const TIPS = ["Finding your fans…", "Listening to what they love…", "Picking the best podcasts…"];

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
    <main className="px-4 pb-32 pt-5">
      <h1 className="rise headline text-4xl">Which one did you mean?</h1>
      <p className="rise mt-2 text-lg text-muted-foreground" style={{ "--i": 1 } as React.CSSProperties}>Tap the right one. We never guess for you.</p>
      {run.candidates.map((group, gi) => (
        <section key={group.name} className="mt-7">
          <h2 className="rise text-xl font-semibold" style={{ "--i": gi + 2 } as React.CSSProperties}>&ldquo;{group.name}&rdquo;</h2>
          <div role="radiogroup" aria-label={`Matches for ${group.name}`} className="no-scrollbar -mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
            {group.options.map((o, oi) => {
              const on = g.choices[group.name] === o.id;
              return (
                <button
                  key={o.id} type="button" role="radio" aria-checked={on} onClick={() => g.choose(group.name, o)}
                  className={cn("pop relative w-36 shrink-0 snap-start rounded-2xl bg-card p-2 text-left transition-all", on ? "ring-4 ring-primary" : "ring-1 ring-line")}
                  style={{ "--i": oi } as React.CSSProperties}
                >
                  <Cover src={o.image} seed={o.id} alt="" className="aspect-[3/4] w-full" rounded="rounded-xl" />
                  {on && <span className="pop absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="size-5" aria-hidden="true" /></span>}
                  <span className="mt-2 line-clamp-3 text-sm font-semibold leading-snug">{o.name}</span>
                  {(o.kind || o.detail) && <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{[o.kind, o.detail].filter(Boolean).join(" · ")}</span>}
                </button>
              );
            })}
          </div>
        </section>
      ))}
      <div className="fixed inset-x-0 bottom-0 z-20 space-y-2 bg-paper/95 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 backdrop-blur">
        <button type="button" disabled={!g.ready} onClick={g.confirm} className="flex h-14 w-full items-center justify-center rounded-2xl bg-primary text-lg font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-50">
          Show my podcasts
        </button>
        <button type="button" onClick={g.cancel} className="h-11 w-full text-base font-semibold text-muted-foreground">Cancel</button>
      </div>
    </main>
  );
}

// ---------- Matches

function MatchesScreen({ g, onOpen, more, setMore }: { g: GreenRoom; onOpen: (id: string) => void; more: boolean; setMore: (v: boolean) => void }) {
  const run = g.run!;
  const [first, ...rest] = g.shows;
  const list = more ? rest : rest.slice(0, 9);
  const work = g.brief?.work ?? g.work;
  return (
    <main className="px-4 pt-5">
      <header className="rise flex items-start gap-3">
        <Cover src={g.workCover} seed={work} alt="" className="size-16" rounded="rounded-xl" />
        <div className="min-w-0">
          <DataPill run={run} />
          <h1 className="headline mt-1 text-3xl">{g.shows.length} podcasts for fans of <em>{work}</em></h1>
        </div>
      </header>

      {run.ignoredSeeds.length > 0 && (
        <p className="pop mt-4 rounded-2xl bg-sample-soft p-3 text-sm font-semibold text-sample">
          We couldn&apos;t use {run.ignoredSeeds.map((n) => `"${n}"`).join(", ")}, so these results don&apos;t include {run.ignoredSeeds.length > 1 ? "them" : "it"}.
        </p>
      )}
      {run.state === "partial" && <p className="mt-4 rounded-2xl bg-sample-soft p-3 text-sm font-semibold text-sample">Some results may be missing.</p>}

      <HeroMatch show={first} g={g} onOpen={onOpen} />

      <ol className="mt-4 space-y-3">
        {list.map((s, i) => <MatchCard key={s.id} show={s} rank={i + 2} g={g} onOpen={onOpen} i={i} />)}
      </ol>
      {!more && rest.length > list.length && (
        <button type="button" onClick={() => setMore(true)} className="mt-4 h-12 w-full rounded-2xl border-2 border-primary text-base font-semibold text-primary">
          Show {rest.length - list.length} more
        </button>
      )}
      <button type="button" onClick={g.reset} className="mt-3 h-12 w-full text-base font-semibold text-muted-foreground">New search</button>
    </main>
  );
}

function DataPill({ run }: { run: UiRun }) {
  return run.mode === "sample"
    ? <span className="inline-block rounded-full bg-sample-soft px-2.5 py-0.5 text-xs font-bold text-sample">SAMPLE · Not Qloo data</span>
    : <span className="inline-flex items-center gap-1 rounded-full bg-live-soft px-2.5 py-0.5 text-xs font-bold text-live"><span className="size-1.5 rounded-full bg-live" />Real data</span>;
}

function HeroMatch({ show, g, onOpen }: { show: UiShow; g: GreenRoom; onOpen: (id: string) => void }) {
  const v = vibeOf(show.id);
  return (
    <div className="rise relative mt-5 overflow-hidden rounded-3xl text-white" style={{ background: v.fill, "--i": 1 } as React.CSSProperties}>
      <button type="button" onClick={() => onOpen(show.id)} className="block w-full text-left" aria-label={`${show.name}, best match. See why it fits`}>
        <div className="relative aspect-[4/3] w-full">
          <Cover src={show.image} seed={show.id} alt="" className="absolute inset-0 size-full" rounded="rounded-none" />
          <span aria-hidden="true" className="absolute inset-x-0 -bottom-px top-0" style={{ background: `linear-gradient(180deg, transparent 35%, ${v.fill} 92%)` }} />
          <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-sm font-bold text-foreground">#1 best match</span>
        </div>
        <div className="relative -mt-14 flex items-end gap-3 px-5 pb-5">
          <div className="min-w-0 flex-1">
            <p className="font-display text-[1.75rem] font-semibold leading-tight">{show.name}</p>
            <Topics topics={show.topics} light className="mt-2" />
          </div>
          <span className="rounded-full bg-white/15 p-1"><FitRing value={show.overlap} size={64} stroke="#ffffff" track="rgb(255 255 255 / 0.25)" hundred /></span>
        </div>
      </button>
      <SaveButton g={g} show={show} light className="absolute right-3 top-3" />
    </div>
  );
}

function MatchCard({ show, rank, g, onOpen, i }: { show: UiShow; rank: number; g: GreenRoom; onOpen: (id: string) => void; i: number }) {
  const v = vibeOf(show.id);
  return (
    <li className="rise relative" style={{ "--i": i + 2 } as React.CSSProperties}>
      <button type="button" onClick={() => onOpen(show.id)} className="flex w-full items-center gap-3 rounded-3xl bg-card p-3 pr-14 text-left shadow-[0_6px_24px_-14px_rgb(15_42_32/0.5)] transition-transform active:scale-[0.98]">
        <span className="relative">
          <Cover src={show.image} seed={show.id} alt="" className="size-20" rounded="rounded-2xl" />
          <span className="absolute -bottom-1 -left-1 grid size-7 place-items-center rounded-full text-xs font-bold text-white ring-2 ring-card" style={{ background: v.fill }}>{rank}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-lg font-semibold leading-snug">{show.name}</span>
          <Topics topics={show.topics?.slice(0, 2)} className="mt-1.5" />
        </span>
        <span style={{ color: v.fill }}><FitRing value={show.overlap} size={48} stroke={v.fill} hundred /></span>
      </button>
      <SaveButton g={g} show={show} className="absolute right-2 top-2" />
    </li>
  );
}

function Topics({ topics, light, className }: { topics?: string[]; light?: boolean; className?: string }) {
  if (!topics?.length) return null;
  return (
    <span className={cn("flex flex-wrap gap-1.5", className)}>
      {topics.slice(0, 3).map((t) => {
        const v = vibeOf(t);
        return (
          <span key={t} className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", light ? "bg-white/20 text-white" : "text-foreground")} style={light ? undefined : { background: v.soft }}>
            {t}
          </span>
        );
      })}
    </span>
  );
}

function SaveButton({ g, show, light, className }: { g: GreenRoom; show: UiShow; light?: boolean; className?: string }) {
  const on = g.isSaved(show.id);
  return (
    <button
      type="button" aria-pressed={on} aria-label={on ? `Remove ${show.name} from saved` : `Save ${show.name}`} onClick={() => g.toggleSave(show)}
      className={cn("grid size-11 place-items-center rounded-full", light ? "bg-black/25 text-white backdrop-blur" : "text-coral-ink", className)}
    >
      <Heart key={String(on)} className={cn("size-6", on && "heart-beat fill-current")} aria-hidden="true" />
    </button>
  );
}

// ---------- Why it fits

function WhyScreen({ g, show, onBack, onPitch }: { g: GreenRoom; show: UiShow; onBack: () => void; onPitch: () => void }) {
  const v = vibeOf(show.id);
  const e = g.enrichment;
  return (
    <main>
      <div className="relative overflow-hidden px-4 pb-8 pt-4 text-white" style={{ background: v.fill }}>
        {show.image && (
          // eslint-disable-next-line @next/next/no-img-element -- decorative blurred backdrop of the same cover
          <img src={show.image} alt="" aria-hidden="true" referrerPolicy="no-referrer" className="absolute inset-0 size-full scale-125 object-cover opacity-40 blur-2xl" />
        )}
        <div className="relative flex items-center justify-between">
          <button type="button" onClick={onBack} aria-label="Back" className="grid size-11 place-items-center rounded-full bg-black/25 backdrop-blur"><ArrowLeft className="size-6" aria-hidden="true" /></button>
          <SaveButton g={g} show={show} light />
        </div>
        <div className="relative mt-2 flex flex-col items-center text-center">
          <Cover src={show.image} seed={show.id} alt={`${show.name} cover`} className="pop size-44 shadow-2xl" rounded="rounded-3xl" />
          <h1 className="rise mt-5 font-display text-3xl font-semibold leading-tight" style={{ "--i": 1 } as React.CSSProperties}>{show.name}</h1>
          {show.channel && <p className="mt-1 text-base text-white/85">{show.channel}</p>}
          <div className="rise mt-4 flex items-center gap-3 rounded-full bg-white/15 py-1.5 pl-1.5 pr-5" style={{ "--i": 2 } as React.CSSProperties}>
            <FitRing value={show.overlap} size={56} stroke="#ffffff" track="rgb(255 255 255 / 0.25)" hundred />
            <span className="text-left text-sm font-semibold leading-tight">How well it fits<br />your fans&apos; taste</span>
          </div>
        </div>
      </div>

      <div className="-mt-4 space-y-4 rounded-t-3xl bg-paper px-4 pt-6">
        {show.topics?.length ? (
          <Card i={1} title="Known for"><Chips items={show.topics} /></Card>
        ) : null}
        <SharedCard e={e} />
        <AudienceCard e={e} />
        {show.description && (
          <Card i={4} title="About the show"><p className="text-base leading-relaxed">{show.description}</p></Card>
        )}
        <p className="px-1 text-xs text-muted-foreground">
          {show.mode === "sample" ? "SAMPLE · Not Qloo data." : `Real data from Qloo · ${shortDate(show.provenance.retrievedAt)}.`} Fit shows shared taste, not a booking promise.
        </p>
      </div>

      <div className="sticky bottom-0 z-20 bg-gradient-to-t from-paper via-paper to-transparent px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-6">
        <button type="button" onClick={onPitch} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-semibold text-white transition-transform active:scale-[0.98]" style={{ background: v.fill }}>
          <Sparkles className="size-5" aria-hidden="true" /> Write my pitch
        </button>
      </div>
    </main>
  );
}

function Card({ title, children, i }: { title: string; children: React.ReactNode; i: number }) {
  return (
    <section className="rise rounded-3xl bg-card p-5" style={{ "--i": i } as React.CSSProperties}>
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((t, i) => (
        <span key={t} className="pop rounded-full px-3.5 py-1.5 text-sm font-semibold text-white" style={{ background: vibeOf(t).fill, "--i": i } as React.CSSProperties}>{t}</span>
      ))}
    </div>
  );
}

function SharedCard({ e }: { e: EnrichmentState }) {
  if (e.angles?.state !== "ok") return null; // optional extra: shown only when Qloo returns shared themes
  return <Card i={2} title="What it shares with your work"><Chips items={e.angles.data.map((a) => a.tag)} /></Card>;
}

const ageLabel = (k: string) => k.replace(/ to /g, "–").replace("24 and younger", "under 25").replace("55 and older", "55+");

function AudienceCard({ e }: { e: EnrichmentState }) {
  if (e.loading) return <section className="h-28 animate-pulse rounded-3xl bg-paper-deep" aria-label="Loading listeners" />;
  if (e.audience?.state !== "ok") return null;
  // Only positive values are drawn: a bar must never stand for a negative or absent figure.
  const age = e.audience.data.age.filter((a) => a.share > 0);
  const gender = e.audience.data.gender.filter((x) => x.share > 0);
  if (!age.length && !gender.length) return null;
  const max = Math.max(...age.map((a) => a.share), 0.0001);
  const lead = gender[0];
  return (
    <Card i={3} title="Who listens">
      {lead && <p className="text-base">Leans <strong>{lead.label === "female" ? "women" : lead.label === "male" ? "men" : lead.label}</strong></p>}
      <ul className="mt-3 space-y-2">
        {age.slice(0, 4).map((a, i) => (
          <li key={a.label} className="grid grid-cols-[5.5rem_1fr] items-center gap-3 text-sm">
            <span className="font-semibold">{ageLabel(a.label)}</span>
            <span className="h-3 overflow-hidden rounded-full bg-paper-deep">
              <span className="bar-grow block h-full rounded-full" style={{ width: `${Math.max(8, (a.share / max) * 100)}%`, background: ["#b8432c", "#17666b", "#6b3a7a", "#2c5aa0"][i], "--i": i } as React.CSSProperties} />
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">Ages that lean most toward this show. Not a headcount.</p>
    </Card>
  );
}

// ---------- Pitch

function PitchScreen({ g, show, onBack }: { g: GreenRoom; show: UiShow; onBack: () => void }) {
  const v = vibeOf(show.id);
  const text = g.pitchFor(show);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked: the text stays selectable */ }
  };
  return (
    <main className="px-4 pt-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} aria-label="Back" className="grid size-11 place-items-center rounded-full bg-card"><ArrowLeft className="size-6" aria-hidden="true" /></button>
        <h1 className="font-display text-2xl font-semibold">Your pitch</h1>
      </div>
      <div className="rise mt-4 flex items-center gap-3 rounded-3xl p-3 text-white" style={{ background: v.fill }}>
        <Cover src={show.image} seed={show.id} alt="" className="size-14" rounded="rounded-xl" />
        <p className="min-w-0 text-base">To <strong className="block truncate text-lg">{show.name}</strong></p>
      </div>
      <label htmlFor="m-pitch" className="sr-only">Your pitch, editable</label>
      <textarea
        id="m-pitch" value={text} onChange={(e) => g.setPitch(show.id, e.target.value)} rows={11}
        className="rise mt-4 block w-full resize-y rounded-3xl border-2 border-input bg-card p-5 font-display text-lg leading-relaxed focus:border-primary focus:outline-none"
        style={{ "--i": 1 } as React.CSSProperties}
      />
      <p className="mt-3 rounded-2xl bg-sample-soft p-4 text-sm font-semibold text-sample">Read it over and make it yours before you send it. Green Room never sends anything.</p>
      <div className="mt-4 grid grid-cols-2 gap-3 pb-6">
        <button type="button" onClick={copy} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-primary text-lg font-semibold text-primary-foreground active:scale-[0.98]">
          {copied ? <Check className="pop size-5" aria-hidden="true" /> : <Copy className="size-5" aria-hidden="true" />}{copied ? "Copied" : "Copy"}
        </button>
        <button type="button" aria-pressed={g.isSaved(show.id)} onClick={() => g.toggleSave(show)} className="flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-primary text-lg font-semibold text-primary active:scale-[0.98]">
          <Heart className={cn("size-5", g.isSaved(show.id) && "fill-current")} aria-hidden="true" />{g.isSaved(show.id) ? "Saved" : "Save"}
        </button>
      </div>
    </main>
  );
}

// ---------- Saved

function SavedScreen({ g, onOpen, onFind }: { g: GreenRoom; onOpen: (id: string) => void; onFind: () => void }) {
  return (
    <main className="px-4 pt-5">
      <h1 className="rise headline text-4xl">Saved</h1>
      <p className="mt-1 text-base text-muted-foreground">Kept on this phone only.</p>
      {g.saved.length === 0 ? (
        <div className="pop mt-10 flex flex-col items-center text-center">
          <span className="grid size-24 place-items-center rounded-full bg-[#fde3d8] text-coral-ink"><Heart className="size-10" aria-hidden="true" /></span>
          <p className="mt-4 text-lg font-semibold">Nothing saved yet</p>
          <p className="text-base text-muted-foreground">Tap the heart on any podcast to keep it here.</p>
          <button type="button" onClick={onFind} className="mt-5 h-12 rounded-2xl bg-primary px-6 text-base font-semibold text-primary-foreground">Find podcasts</button>
        </div>
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-3">
          {g.saved.map((s, i) => (
            <li key={s.id} className="pop relative" style={{ "--i": i } as React.CSSProperties}>
              <button type="button" onClick={() => onOpen(s.id)} className="block w-full rounded-3xl p-2 text-left text-white" style={{ background: vibeOf(s.id).fill }}>
                <Cover src={s.image} seed={s.id} alt="" className="aspect-square w-full" rounded="rounded-2xl" />
                <span className="mt-2 line-clamp-2 px-1 pb-1 text-base font-semibold leading-snug">{s.name}</span>
              </button>
              <SaveButton g={g} show={s} light className="absolute right-3 top-3" />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

// ---------- Nav

function BottomNav({ tab, setTab, savedCount, onHome }: { tab: Tab; setTab: (t: Tab) => void; savedCount: number; onHome: () => void }) {
  const item = (t: Tab, label: string, Icon: typeof Home, extra?: React.ReactNode) => (
    <button
      type="button" aria-current={tab === t ? "page" : undefined}
      onClick={() => { if (t === "home") onHome(); setTab(t); }}
      className={cn("relative flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-base font-semibold transition-colors", tab === t ? "bg-primary text-primary-foreground" : "text-foreground")}
    >
      <Icon className="size-5" aria-hidden="true" />{label}{extra}
    </button>
  );
  return (
    <nav aria-label="Main" className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-30 flex gap-1 rounded-full bg-card/95 p-1.5 shadow-[0_10px_30px_-10px_rgb(15_42_32/0.5)] backdrop-blur">
      {item("home", "Discover", Home)}
      {item("saved", "Saved", Heart, savedCount > 0 && <span key={savedCount} className="pop grid min-w-6 place-items-center rounded-full bg-[#b8432c] px-1.5 text-xs text-white">{savedCount}</span>)}
    </nav>
  );
}
