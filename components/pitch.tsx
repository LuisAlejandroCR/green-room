// pitch.tsx: short editable pitch. There is no send action and no email integration, by design.
import { AlertTriangle } from "lucide-react";

export function PitchEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-3">
      <label htmlFor="pitch" className="sr-only">Pitch draft</label>
      <textarea id="pitch" value={value} onChange={(e) => onChange(e.target.value)} rows={9}
        className="w-full rounded-2xl border border-input bg-card p-4 font-display text-base leading-relaxed" />
      <p role="note" className="flex items-start gap-2 rounded-2xl bg-sample-soft p-3 text-sm text-sample">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span><strong>Review before using.</strong> Check for accuracy and make it your own voice. Green Room never sends email.</span>
      </p>
    </div>
  );
}
