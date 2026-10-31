// candidates.ts: labels and progress for "Which one did you mean?". Qloo's own search order comes first (its top
// match is the first candidate, as /search returned it); Claude's suggestion is a second, separate signal. Neither
// selects anything: the person still picks one per name.

export type CandidateBadge = "both" | "qloo" | "claude" | null;

export const BADGE_TEXT: Record<Exclude<CandidateBadge, null>, string> = {
  both: "Qloo and Claude agree",
  qloo: "Qloo's top match",
  claude: "Claude suggests",
};

/** Badge for the option at `index`. Qloo's top match is index 0; Claude's suggestion is the option id it named. */
export function candidateBadge(index: number, optionId: string, suggestedId: string | null | undefined): CandidateBadge {
  const top = index === 0;
  const claude = !!suggestedId && suggestedId === optionId;
  return top && claude ? "both" : top ? "qloo" : claude ? "claude" : null;
}

/** The work's title for pitches: the candidate the person picked (main title, before any ": subtitle"), else what
 * they typed. So picking "Atomic Habits Journal: A Daily..." pitches "Atomic Habits Journal", not the typed name. */
export function workTitle(typed: string, picked?: { name: string }): string {
  const main = picked?.name.split(":")[0].trim();
  return main || typed.trim();
}

/** How many names have a pick, and which names still need one, in the order they were typed. */
export function pickProgress(groups: { name: string }[], choices: Record<string, string | undefined>) {
  const missing = groups.filter((g) => !choices[g.name]).map((g) => g.name);
  return { picked: groups.length - missing.length, total: groups.length, missing };
}

/** One plain line explaining why the confirm button is still disabled, or null when it is ready. */
export function pickHint(groups: { name: string }[], choices: Record<string, string | undefined>): string | null {
  const p = pickProgress(groups, choices);
  if (!p.missing.length) return null;
  const left = p.missing.map((n) => `“${n}”`).join(", ");
  return p.total === 1 ? `Pick one match for ${left} to continue.` : `Pick one match per name to continue: ${p.picked} of ${p.total} chosen, still to pick: ${left}.`;
}
