// pitch.ts: deterministic short pitch draft. It only uses the guest's work, the show name and tags Qloo returned.
// No model call: nothing here can invent a show, a number or a tag. It is the labelled fallback when Claude is not configured.
export function draftPitch(work: string, show: string, themes: string[], topics: string[] = []): string {
  const shared = themes.slice(0, 3);
  const listed = topics.slice(0, 3);
  return [
    `Hi there, I'd love to share ${work} with ${show}'s listeners.`,
    shared.length
      ? `Qloo's audience data points to shared themes: ${shared.join(", ")}.`
      : listed.length
        ? `Qloo lists your show under ${listed.join(", ")}, and its audience data suggests a thematic fit.`
        : "Qloo's audience data suggests a thematic fit.",
    "Happy to send a short brief and suggested questions.",
    "[Your name]",
  ].join("\n\n");
}

export interface PitchFacts {
  work: string;
  show: string;
  showTopics: string[];
  sharedThemes: string[];
  workTaste: string[];
}

/** The facts a draft may rely on, as JEV evidence. The affinity line states what every result means (aggregate taste). */
export function pitchEvidence(e: PitchFacts): string[] {
  return [
    `guest's work: ${e.work}`,
    `show: ${e.show}`,
    `Qloo audience data: in aggregate, fans of ${e.work} show taste affinity for ${e.show}`,
    ...(e.showTopics.length ? [`the show's Qloo tags: ${e.showTopics.join(", ")}`] : []),
    ...(e.sharedThemes.length ? [`themes Qloo finds shared by the work and the show: ${e.sharedThemes.join(", ")}`] : []),
    ...(e.workTaste.length ? [`Qloo taste analysis of the work: ${e.workTaste.join(", ")}`] : []),
  ];
}
