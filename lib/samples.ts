// Synthetic fixtures with the exact response shape. NOT Qloo data; the UI labels them as SAMPLE.
import type { PodcastMatch } from "./qloo";

export const SAMPLE_PODCASTS: PodcastMatch[] = [
  { id: "sample-1", name: "Sample Show A", affinity: 0.82, popularity: 0.31 },
  { id: "sample-2", name: "Sample Show B", affinity: 0.77, popularity: 0.18 },
  { id: "sample-3", name: "Sample Show C", affinity: 0.71, popularity: 0.44 },
];
