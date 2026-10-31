// pitch.ts: deterministic short pitch draft. It only uses the guest's work, the show name and tags Qloo returned.
// No model call: nothing here can invent a show, a number or a tag.
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
