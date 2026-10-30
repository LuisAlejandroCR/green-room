// nav.tsx: Discover, Shortlists, Receipts. Dark sidebar on desktop, icon-first bottom bar on mobile.
"use client";

import { Bookmark, FileText, Search } from "lucide-react";
import { LeafMark } from "./art";
import { cn } from "@/lib/utils";

export type View = "discover" | "shortlists" | "receipts";

const ITEMS: { view: View; label: string; Icon: typeof Search }[] = [
  { view: "discover", label: "Discover", Icon: Search },
  { view: "shortlists", label: "Shortlists", Icon: Bookmark },
  { view: "receipts", label: "Receipts", Icon: FileText },
];

export function Sidebar({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <nav aria-label="Main" className="on-dark flex flex-col gap-1 bg-nav p-4 text-on-dark">
      <p className="mb-6 flex items-center gap-2 px-2 font-display text-lg font-semibold">
        <LeafMark className="size-6 text-primary" /> Green Room
      </p>
      {ITEMS.map(({ view: v, label, Icon }) => (
        <button key={v} type="button" onClick={() => onChange(v)} aria-current={view === v ? "page" : undefined}
          className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold", view === v ? "bg-on-dark-line" : "text-on-dark-muted hover:bg-on-dark-line/60")}>
          <Icon className="size-4" aria-hidden="true" /> {label}
        </button>
      ))}
    </nav>
  );
}

export function BottomNav({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t bg-card pb-[env(safe-area-inset-bottom)]">
      {ITEMS.map(({ view: v, label, Icon }) => (
        <button key={v} type="button" onClick={() => onChange(v)} aria-current={view === v ? "page" : undefined}
          className={cn("flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold", view === v ? "text-primary" : "text-muted-foreground")}>
          <Icon className="size-6" aria-hidden="true" />
          {label}
        </button>
      ))}
    </nav>
  );
}
