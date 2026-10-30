// matches.tsx: podcast rows. Desktop: art, title, one description line, score, "Open receipt".
// Mobile: art, title and score only. Descriptions come from Qloo only; absent shows "unavailable".
import { ChevronRight } from "lucide-react";
import { Art } from "./art";
import { ScoreRing } from "./score-ring";
import { Button } from "@/components/ui/button";
import type { UiShow } from "@/lib/ui/types";
import { cn } from "@/lib/utils";

export function MatchRow({ show, selected, onOpen }: { show: UiShow; selected: boolean; onOpen: () => void }) {
  return (
    <li className={cn("flex items-center gap-4 rounded-2xl border bg-card p-3 shadow-soft", selected && "border-primary ring-1 ring-primary")}>
      <span className="size-14 shrink-0 overflow-hidden rounded-xl"><Art seed={show.id} /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-lg font-semibold">{show.name}</span>
        <span className={cn("block text-sm", show.description ? "text-muted-foreground" : "italic text-muted-foreground")}>
          <span className="line-clamp-1">{show.description ?? "Description unavailable from Qloo"}</span>
        </span>
      </span>
      <ScoreRing value={show.overlap} />
      <Button variant="outline" size="sm" className="h-11 px-4" onClick={onOpen} aria-label={`Open receipt for ${show.name}`}>
        Open receipt
      </Button>
    </li>
  );
}

export function MatchTile({ show, onOpen }: { show: UiShow; onOpen: () => void }) {
  return (
    <li>
      <button type="button" onClick={onOpen} aria-label={`${show.name}, ${show.overlap === undefined ? "affinity unavailable" : `affinity ${show.overlap.toFixed(2)}`}. Open receipt`}
        className="flex min-h-16 w-full items-center gap-3 rounded-2xl border bg-card p-2.5 text-left shadow-soft">
        <span className="size-12 shrink-0 overflow-hidden rounded-lg"><Art seed={show.id} /></span>
        <span className="min-w-0 flex-1 truncate font-display text-base font-semibold">{show.name}</span>
        <ScoreRing value={show.overlap} size={44} />
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
    </li>
  );
}
