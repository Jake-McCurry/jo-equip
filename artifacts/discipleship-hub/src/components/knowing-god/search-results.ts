import { BOOKS } from "../../../worker/bible-catalog.js";
import { scriptureReaderPath } from "./scripture-link.ts";

const bookOrder = new Map(BOOKS.map((book, index) => [book.name, index]));

function scriptureOrder(reference: string): number[] {
  try {
    // Share alias and single-chapter interpretation with the destination link.
    const query = new URLSearchParams(scriptureReaderPath(reference, "KJV").split("?")[1]);
    return [bookOrder.get(query.get("book")!) ?? BOOKS.length,
      Number(query.get("chapter")), Number(query.get("verse") || 1)];
  } catch {
    // Keep an unexpected source reference visible, after recognized references.
    return [BOOKS.length, 0, 0];
  }
}

export type SearchTopic = {
  id: string;
  title: string;
  letter: string;
  passageCount: number;
};
type SearchPassage = { reference: string; text: string };
type LoadedTopic = SearchTopic & { passages: SearchPassage[] };

export function findTopicResults<T extends SearchTopic>(topics: T[], query: string): T[] {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return [];
  return topics.filter(topic => topic.title.toLocaleLowerCase().includes(q))
    .sort((a, b) => Number(b.title.toLocaleLowerCase() === q) - Number(a.title.toLocaleLowerCase() === q) || a.title.localeCompare(b.title));
}

export function scriptureMatcher(query: string) {
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "iu");
}

export function findScriptureResults(topics: LoadedTopic[], query: string) {
  if (!query.trim()) return [];
  const matcher = scriptureMatcher(query);
  const unique = new Map<string, SearchPassage & { topic: SearchTopic }>();
  for (const topic of topics) {
    for (const passage of topic.passages) {
      if (!matcher.test(passage.text)) continue;
      const key = `${passage.reference}:${passage.text.replace(/\s+/g, " ").trim()}`;
      if (!unique.has(key)) unique.set(key, { ...passage, topic });
    }
  }
  return [...unique.values()]
    .map(passage => ({ passage, order: scriptureOrder(passage.reference) }))
    .sort((a, b) => a.order[0] - b.order[0] || a.order[1] - b.order[1] ||
      a.order[2] - b.order[2] || a.passage.reference.localeCompare(b.passage.reference) ||
      a.passage.text.localeCompare(b.passage.text))
    .map(({ passage }) => passage);
}
