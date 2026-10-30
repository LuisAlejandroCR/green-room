// pitch.ts: deterministic pitch draft. It only uses the guest's work, the show name and tags Qloo returned.
// No model call: nothing here can invent a show, a number or a tag.
export function draftPitch(work: string, show: string, angles: string[]): string {
  const hook = angles.length
    ? `Your listeners and ${work}'s audience share an interest in ${angles.slice(0, 3).join(", ")}.`
    : `Qloo's audience data suggests overlap between your listeners and ${work}'s audience.`;
  return [
    `Subject: ${work} for ${show}`,
    "",
    `Hi,`,
    "",
    hook,
    `I'd love to talk about ${work} on ${show}. Happy to send a short brief and suggested questions.`,
    "",
    "Thanks,",
    "[Your name]",
  ].join("\n");
}
