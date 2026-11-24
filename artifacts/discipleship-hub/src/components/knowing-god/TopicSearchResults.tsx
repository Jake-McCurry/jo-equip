import { useEffect, useMemo, useState } from "react";
import { findScriptureResults, findTopicResults, scriptureMatcher, translatedSearchTopics, type SearchTopic } from "./search-results";
import { fetchNetPassages, netCache, netNotes } from "./bible-api";

type LoadedTopic = SearchTopic & { passages: { reference: string; text: string }[] };
type Props<T extends SearchTopic> = {
  topics: T[];
  query: string;
  testament: string;
  book: string;
  translation: "NET" | "KJV";
  payloads: Record<string, LoadedTopic[]>;
  loadLetter: (letter: string) => Promise<LoadedTopic[]>;
  onOpen: (topic: T) => void;
  scriptureHref: (reference: string) => string;
};

export function TopicSearchResults<T extends SearchTopic>({ topics, query, testament, book, translation, payloads, loadLetter, onOpen, scriptureHref }: Props<T>) {
  const [status, setStatus] = useState({ key: "", pending: true, error: false });
  const [retry, setRetry] = useState(0);
  const [limit, setLimit] = useState(25);
  const letters = [...new Set(topics.map(topic => topic.letter))].join("");
  const requestKey = JSON.stringify([query, letters, translation, retry]);
  const pending = status.key !== requestKey || status.pending;
  const error = status.key === requestKey && status.error;
  useEffect(() => {
    const controller = new AbortController();
    setStatus({ key: requestKey, pending: true, error: false });
    const timer = window.setTimeout(async () => {
      const queue = letters.split("");
      let failed = false;
      const loaded: LoadedTopic[] = [];
      await Promise.all(Array.from({ length: 3 }, async () => {
        while (queue.length && !controller.signal.aborted) {
          const letter = queue.shift()!;
          try { loaded.push(...await loadLetter(letter)); } catch { failed = true; }
        }
      }));
      if (controller.signal.aborted) return;
      if (translation === "NET") {
        const ids = new Set(topics.map(topic => topic.id));
        const references = loaded.filter(topic => ids.has(topic.id)).flatMap(topic => topic.passages.map(p => p.reference));
        try {
          if (!await fetchNetPassages(references, 3, controller.signal)) failed = true;
        } catch { failed = true; }
      }
      if (!controller.signal.aborted) setStatus({ key: requestKey, pending: false, error: failed });
    }, 250);
    return () => { controller.abort(); window.clearTimeout(timer); };
    // loadLetter is recreated by the parent; requests are deduplicated there.
    // The parent remounts this component when translation or scope changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);
  useEffect(() => setLimit(25), [query, letters, testament, book, translation]);
  const titleMatches = useMemo(() => findTopicResults(topics, query), [topics, query]);
  const verseMatches = useMemo(() => {
    const ids = new Set(topics.map(topic => topic.id));
    const loaded = Object.values(payloads).flat().filter(topic => ids.has(topic.id));
    return findScriptureResults(translatedSearchTopics(loaded, translation, netCache, netNotes), query, { testament, book });
  }, [topics, payloads, query, testament, book, translation, status]);
  const snippet = (text: string) => {
    const match = scriptureMatcher(query).exec(text);
    const start = Math.max(0, (match?.index ?? 0) - 70);
    const end = Math.min(text.length, Math.max(start + 220, (match?.index ?? 0) + (match?.[0].length ?? 0) + 70));
    return `${start ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
  };
  return (
    <div className="kg-sans space-y-5" aria-live="polite">
      <section aria-labelledby="topic-results-heading">
        <h3 id="topic-results-heading" className="text-base font-bold">Topic results <span className="text-xs font-normal text-[var(--color-text-muted,#2E5A7A)]">({titleMatches.length})</span></h3>
        {titleMatches.length ? titleMatches.map(topic => (
          <button key={topic.id} type="button" onClick={() => onOpen(topic)} className="kg-focus block min-h-11 w-full py-2 text-left text-base hover:underline">{topic.title}</button>
        )) : <p className="py-2 text-sm text-[var(--color-text-muted,#2E5A7A)]">No topic titles match.</p>}
      </section>
      <section aria-labelledby="scripture-results-heading" className="border-t border-[var(--color-border-soft,#CCEBFF)] pt-4">
        <h3 id="scripture-results-heading" className="text-base font-bold">Scripture results <span className="text-xs font-normal text-[var(--color-text-muted,#2E5A7A)]">({verseMatches.length}{pending || error ? "+" : ""})</span></h3>
        <p className="mt-1 text-xs text-[var(--color-text-muted,#2E5A7A)]">Matching words in the {translation} Scripture text.</p>
        {(testament !== "All Testaments" || book !== "All books") && <p className="mt-1 text-sm">Passage filters: {[testament, book].filter(value => value !== "All Testaments" && value !== "All books").join(" · ")}</p>}
        {pending && <p role="status" className="py-2 text-sm">Loading and searching {translation} Scripture across topics…</p>}
        {error && <p role="alert" className="py-2 text-sm">Some {translation} Scripture could not be loaded or searched. Results are incomplete. <button type="button" onClick={() => setRetry(value => value + 1)} className="underline">Try again</button></p>}
        {!pending && !error && !verseMatches.length && <p className="py-2 text-sm">No Scripture text matches{testament !== "All Testaments" || book !== "All books" ? " the current passage filters" : ""}.</p>}
        {verseMatches.slice(0, limit).map((passage, i) => (
          <article key={`${passage.reference}-${i}`} className="border-b border-[var(--color-border-soft,#CCEBFF)] py-3">
            <div className="flex flex-wrap items-center gap-2"><a href={scriptureHref(passage.reference)} target="_blank" rel="noopener noreferrer" className="kg-focus inline-flex min-h-11 items-center text-sm font-bold underline">{passage.reference}</a><span className="text-xs font-normal">{translation}</span></div>
            <p className="text-sm leading-relaxed">{snippet(passage.text)}</p>
            {passage.note && <p className="mt-2 text-sm text-[var(--color-text-muted,#2E5A7A)]"><strong>Translation note:</strong> {passage.note}</p>}
          </article>
        ))}
        {verseMatches.length > limit && <button type="button" onClick={() => setLimit(value => value + 25)} className="kg-focus min-h-11 py-2 text-sm font-bold underline">Show more Scripture results</button>}
      </section>
    </div>
  );
}
