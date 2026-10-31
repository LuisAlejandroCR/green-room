// candidate-badge.tsx: the label on a "Which one did you mean?" card. Qloo's top match is green and comes first;
// Claude's suggestion is purple and secondary. A label never selects the card.
import { BADGE_TEXT, type CandidateBadge } from "@/lib/ui/candidates";
import { cn } from "@/lib/utils";

const TONE: Record<Exclude<CandidateBadge, null>, string> = {
  both: "bg-primary text-primary-foreground",
  qloo: "bg-primary text-primary-foreground",
  claude: "bg-[#6b3a7a] text-white",
};

export function CandidateBadgeTag({ badge, className }: { badge: CandidateBadge; className?: string }) {
  if (!badge) return null;
  return (
    <span className={cn("absolute left-3 top-3 max-w-[calc(100%-3.5rem)] rounded-full px-2 py-0.5 text-xs font-semibold leading-tight", TONE[badge], className)}>
      {BADGE_TEXT[badge]}
    </span>
  );
}
