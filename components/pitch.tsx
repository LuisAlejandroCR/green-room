// pitch.tsx: Pitch Studio, the pitch as an editorial note: a letterhead, a generous reading size and a margin note.
// Editable and never sent: there is no send action and no email integration, by design.
"use client";

import { useLayoutEffect, useRef } from "react";
import { Art } from "./art";

export function PitchEditor({ value, onChange, to, re, seed, banner }: {
  value: string; onChange: (v: string) => void; to: string; re: string; seed: string; banner?: boolean;
}) {
  const area = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <div className="space-y-6">
      {banner && <div className="-mx-5 h-36 overflow-hidden"><Art seed={seed} variant="leaf" /></div>}
      <header>
        <p className="eyebrow">Production note</p>
        <dl className="mt-3 grid grid-cols-[3.5rem_minmax(0,1fr)] gap-y-1.5 border-y border-line py-3 text-sm">
          <dt className="text-muted-foreground">For</dt><dd className="font-semibold">{to}</dd>
          <dt className="text-muted-foreground">Re</dt><dd className="break-words">{re || "Your guest's work"}</dd>
          <dt className="text-muted-foreground">Status</dt><dd><span className="inline-block rounded-[3px] bg-sample-soft px-2 py-0.5 text-xs font-semibold text-sample">Draft · unsent</span></dd>
        </dl>
      </header>
      <div>
        <label htmlFor="pitch" className="block font-display text-xl italic">Your pitch (editable)</label>
        <p className="mt-0.5 text-sm text-muted-foreground">Use this as a starting point. Make it your own.</p>
        <textarea id="pitch" ref={area} value={value} onChange={(e) => onChange(e.target.value)} rows={8}
          className="mt-3 block w-full resize-none overflow-hidden rounded-[6px] border border-input bg-card p-5 font-display text-xl leading-[1.7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1" />
      </div>
      <p role="note" className="border-l-4 border-saffron bg-sample-soft p-4 text-sm text-sample">
        <strong>Review before using.</strong> Check for accuracy and make it your own voice. Green Room never sends email.
      </p>
    </div>
  );
}
