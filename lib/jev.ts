// jev.ts: closed-question review of a pitch draft with JEV (TypeSafe System One). Contract verified against
// docs.typesafe.ai on 2026-10-30: POST /v1/systemone, Bearer key, {model, state, questions}; each Noul answer is
// answers[id].noul in [0, 1]. Deterministic checks run first and win over JEV. Any JEV failure means human review,
// never approval. Thresholds are proposals from the knowledge base, not calibrated results.
export const JEV_URL = "https://api.typesafe.ai/v1/systemone";
export const JEV_MODEL = "jev-1.14.0"; // pinned after a live check, instead of the moving jev-latest alias
export const RISK_LOW = 0.2;
export const RISK_HIGH = 0.8;
const TIMEOUT_MS = 5000;

export type ReviewDecision = "editorial_check_passed" | "human_review" | "revise" | "blocked";

export interface ReviewReason {
  rule: string;
  value?: string | number;
}

export interface Review {
  decision: ReviewDecision;
  reasons: ReviewReason[];
  answers: Record<string, number>; // JEV probabilities by question id, when JEV answered
  model?: string;
  checkedAt: string;
}

export interface ReviewInput {
  claim: string; // the draft text
  evidence: string[]; // the Qloo facts the draft may use: work, show, tags
  sourceMode: "live" | "recorded" | "sample";
}

export const QUESTIONS = {
  unsupported_claim: {
    type: "noul",
    instructions: "Does the claim state a fact that is not supported by the supplied evidence?",
    criteria: {
      true: "It states something about the show, host, audience or work that the evidence does not contain",
      false: "Every factual statement is in the evidence, or the text only expresses intent and politeness",
    },
  },
  booking_promise: {
    type: "noul",
    instructions: "Does the claim imply a guaranteed interview or a numerical likelihood of booking?",
  },
  individual_inference: {
    type: "noul",
    instructions: "Does the claim infer an individual person's preferences from aggregate audience evidence?",
  },
} as const;

type QuestionId = keyof typeof QUESTIONS;
const IDS = Object.keys(QUESTIONS) as QuestionId[];

/** Deterministic checks: they need no model and override any JEV answer. */
export function deterministicChecks(input: ReviewInput): ReviewReason[] {
  const reasons: ReviewReason[] = [];
  const evidence = input.evidence.join(" ");
  for (const n of new Set(input.claim.match(/\d+(?:[.,]\d+)?%?/g) ?? [])) {
    if (!evidence.includes(n)) reasons.push({ rule: "number_not_in_evidence", value: n });
  }
  if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(input.claim)) reasons.push({ rule: "contact_detail_in_draft", value: "email" });
  if (/\+?\d[\d\s().-]{8,}\d/.test(input.claim)) reasons.push({ rule: "contact_detail_in_draft", value: "phone" });
  return reasons;
}

/** Pure policy over JEV answers: the maximum risk decides; anything invalid is human review. */
export function decide(answers: unknown): { decision: ReviewDecision; reasons: ReviewReason[]; answers: Record<string, number> } {
  const got: Record<string, number> = {};
  const rec = typeof answers === "object" && answers !== null ? (answers as Record<string, unknown>) : {};
  for (const id of IDS) {
    const a = rec[id];
    const p = typeof a === "object" && a !== null ? (a as Record<string, unknown>).noul : undefined;
    if (typeof p !== "number" || !Number.isFinite(p) || p < 0 || p > 1) {
      return { decision: "human_review", reasons: [{ rule: "jev_invalid_response", value: id }], answers: got };
    }
    got[id] = p;
  }
  const high = IDS.filter((id) => got[id] >= RISK_HIGH);
  if (high.length) return { decision: "revise", reasons: high.map((id) => ({ rule: id, value: got[id] })), answers: got };
  const middle = IDS.filter((id) => got[id] > RISK_LOW);
  if (middle.length) return { decision: "human_review", reasons: middle.map((id) => ({ rule: id, value: got[id] })), answers: got };
  return { decision: "editorial_check_passed", reasons: [], answers: got };
}

export async function reviewPitch(input: ReviewInput, fetchImpl: typeof fetch = fetch): Promise<Review> {
  const checkedAt = new Date().toISOString();
  const failed = deterministicChecks(input);
  if (failed.length) return { decision: "blocked", reasons: failed, answers: {}, checkedAt };
  const key = process.env.JEV_API_KEY;
  if (!key) return { decision: "human_review", reasons: [{ rule: "jev_not_configured" }], answers: {}, checkedAt };
  const state = { claim: input.claim.slice(0, 4000), suppliedEvidence: input.evidence.slice(0, 40), sourceMode: input.sourceMode };
  let res: Response;
  try {
    res = await fetchImpl(JEV_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ model: JEV_MODEL, state, questions: QUESTIONS }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    const timeout = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    return { decision: "human_review", reasons: [{ rule: timeout ? "jev_timeout" : "jev_unreachable" }], answers: {}, checkedAt };
  }
  if (!res.ok) return { decision: "human_review", reasons: [{ rule: "jev_http_error", value: res.status }], answers: {}, checkedAt };
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { decision: "human_review", reasons: [{ rule: "jev_invalid_response", value: "json" }], answers: {}, checkedAt };
  }
  const b = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const out = decide(b.answers);
  return { ...out, ...(typeof b.model === "string" && { model: b.model }), checkedAt };
}
