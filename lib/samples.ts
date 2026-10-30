// Synthetic fixtures with the real response shape. NOT Qloo data; served only when QLOO_MODE=sample
// and always labeled SAMPLE in the UI. One fixture has no popularity on purpose: absent stays absent.
export interface SampleEntity {
  id: string;
  name: string;
  affinity: number;
  popularity?: number;
  description?: string;
}

export const SAMPLE_PODCASTS: SampleEntity[] = [
  { id: "sample-1", name: "Sample Show A", affinity: 0.82, popularity: 0.31, description: "Synthetic description: long conversations about making things." },
  { id: "sample-2", name: "Sample Show B", affinity: 0.77, popularity: 0.18, description: "Synthetic description: people and ideas shaping what comes next." },
  { id: "sample-3", name: "Sample Show C", affinity: 0.71 },
];

// Include the word "ambiguous" in an input name to exercise the confirmation step in sample mode.
export function sampleSearch(name: string): { id: string; name: string }[] {
  const slug = name.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 40) || "item";
  if (/ambiguous/i.test(name)) {
    return [
      { id: `sample-${slug}-a`, name: `${name} (sample match A)` },
      { id: `sample-${slug}-b`, name: `${name} (sample match B)` },
    ];
  }
  return [{ id: `sample-${slug}`, name }];
}

export const SAMPLE_DEMOGRAPHICS = { age: { "25_to_29": 0.4 }, gender: { female: 0.55, male: 0.45 } };
export const SAMPLE_ANGLES = [
  { tag: "Sample theme one", score: 0.5 },
  { tag: "Sample theme two", score: 0.4 },
  { tag: "Sample theme three", score: 0.3 },
];
