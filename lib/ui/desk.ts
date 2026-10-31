// desk.ts: pure logic behind the web campaign desk: topic crossfilter, topic counts, column sorting and the URL
// state of the active filter. Absent Qloo values sort last and are never treated as 0.
import type { UiShow } from "./types.ts";

export type SortKey = "affinity" | "popularity" | "name";
export type SortDir = "asc" | "desc";

/** A show passes when it carries every active topic (AND across topics). */
export const filterShows = (shows: UiShow[], topics: string[]): UiShow[] =>
  topics.length ? shows.filter((s) => topics.every((t) => s.topics?.includes(t))) : shows;

/** Topic facets for the current rows, most frequent first, ties by name. */
export function topicCounts(shows: UiShow[]): { topic: string; count: number }[] {
  const m = new Map<string, number>();
  for (const s of shows) for (const t of s.topics ?? []) m.set(t, (m.get(t) ?? 0) + 1);
  return [...m].map(([topic, count]) => ({ topic, count })).sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic));
}

export function sortShows(shows: UiShow[], key: SortKey, dir: SortDir): UiShow[] {
  const val = (s: UiShow) => (key === "affinity" ? s.overlap : key === "popularity" ? s.popularity : undefined);
  return [...shows].sort((a, b) => {
    if (key === "name") return dir === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    const x = val(a);
    const y = val(b);
    if (x === undefined && y === undefined) return 0;
    if (x === undefined) return 1;
    if (y === undefined) return -1;
    return dir === "asc" ? x - y : y - x;
  });
}

export const topicsFromSearch = (search: string): string[] =>
  [...new Set(new URLSearchParams(search).getAll("topic").map((t) => t.trim()).filter(Boolean))].slice(0, 6);

/** Returns the search string with the topic filter replaced; other parameters are kept. */
export function searchWithTopics(search: string, topics: string[]): string {
  const p = new URLSearchParams(search);
  p.delete("topic");
  for (const t of topics) p.append("topic", t);
  const s = p.toString();
  return s ? `?${s}` : "";
}
