// random.ts: titles for "Find live matches" with an empty field. A random, well-known work is typed in for the person
// and run like any typed brief: Qloo still resolves it, and an ambiguous title still asks which one they meant.
export const RANDOM_WORKS = [
  "Dune", "The Midnight Library", "Sapiens", "Educated", "Becoming", "Thinking, Fast and Slow", "The Hunger Games",
  "Project Hail Mary", "Where the Crawdads Sing", "The Martian", "Interstellar", "Oppenheimer", "Barbie", "Inception",
  "Everything Everywhere All at Once", "Taylor Swift", "Beyoncé", "Radiohead", "Kendrick Lamar", "Patagonia", "Nike",
  "LEGO", "The Body Keeps the Score", "Born a Crime", "Atomic Habits", "Breaking Bad", "The Bear", "Succession",
] as const;

/** A random title, never the one just used (so "Find live matches" twice gives two different briefs). */
export function randomWork(previous = "", rand: () => number = Math.random): string {
  const pool = RANDOM_WORKS.filter((w) => w.toLowerCase() !== previous.trim().toLowerCase());
  return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
}
