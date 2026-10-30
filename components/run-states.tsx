// run-states.tsx: every non-success state of a run is explicit: loading, empty, degraded, malformed, partial, cancelled.
import { Skeleton } from "@/components/ui/skeleton";
import { Notice } from "./status";
import type { UiRun } from "@/lib/ui/types";

export function LoadingRows({ count = 3 }: { count?: number }) {
  return (
    <div role="status" aria-label="Asking Qloo" className="space-y-3">
      {Array.from({ length: count }, (_, i) => <Skeleton key={i} className="h-[4.5rem] w-full rounded-2xl" />)}
    </div>
  );
}

export function RunNotice({ run }: { run: UiRun }) {
  switch (run.state) {
    case "cancelled": return <Notice>Search cancelled. Nothing was recommended.</Notice>;
    case "unresolved": return <Notice>Qloo doesn&apos;t know: {run.unresolved.join(", ")}. Try another name.</Notice>;
    case "degraded": return <Notice>We couldn&apos;t get a usable answer from Qloo ({run.note ?? "unavailable"}). We won&apos;t guess.</Notice>;
    case "malformed": return <Notice>Qloo or the server returned data we couldn&apos;t read, so nothing is shown.</Notice>;
    case "failed": return <Notice>Something went wrong reaching the server. Nothing was invented. Try again.</Notice>;
    case "empty": return <Notice>Qloo found no podcasts for this mix. Try fewer or different seeds.</Notice>;
    case "partial": return <Notice>Partial result: the {run.budget?.max ?? 8}-request budget ran out. Not fetched: {run.notFetched.join("; ")}.</Notice>;
    default: return null;
  }
}
