// format.ts: deterministic display helpers (no locale or timezone dependence, so server and client render the same).
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "30 Oct 2026, 06:58 UTC" from an ISO timestamp; the raw value if it is not a valid date. */
export function formatRetrieved(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

/** Affinity is shown on Qloo's own 0-1 scale, never as a percentage. */
export const formatScore = (v: number | undefined): string => (v === undefined ? "n/a" : v.toFixed(2));
