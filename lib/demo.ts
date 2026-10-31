// demo.ts: the one-tap example brief. It runs against live Qloo like any typed brief; nothing here is a result.
// IDs were picked by a person from live /search candidates on 2026-10-31 (the book bundle is one Qloo accepts as a signal),
// so the demo skips the confirmation step without the app ever choosing an ID itself.
export interface DemoBrief {
  work: string;
  seeds: string[];
  confirmed: Record<string, string>;
}

export const DEMO_BRIEF: DemoBrief = {
  work: "Atomic Habits",
  seeds: ["Nike Training Club"],
  confirmed: {
    "Atomic Habits": "903F2078-A8A5-48C0-B254-89572DA0A047",
    "Nike Training Club": "43A36E73-9BC7-4B09-A116-78E51554C3E3",
  },
};
