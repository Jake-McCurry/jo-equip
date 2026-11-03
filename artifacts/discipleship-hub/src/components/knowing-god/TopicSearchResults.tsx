import { useEffect, useMemo, useState } from "react";
import { findScriptureResults, findTopicResults, scriptureMatcher, type SearchTopic } from "./search-results";

type LoadedTopic = SearchTopic & { passages: { reference: string; text: string }[] };
type Props<T extends SearchTopic> = {
  topics: T[];
  query: string;
  payloads: Record<string, LoadedTopic[]>;
  loadLetter: (letter: string) => Promise<LoadedTopic[]>;
  onOpen: (topic: T) => void;
  scriptureHref: (reference: string) => string;
};

export function TopicSearchResults<T extends SearchTopic>({ topics, query, payloads, loadLetter, onOpen, scriptureHref }: Props<T>) {
  const [pending, setPending] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [limit, setLimit] = useState(25);
  const letters = [...new Set(topics.map(topic => topic.letter))].join("");
  useEffect(() => {
    let cancelled = false;
    setPending(true);
    setError(false);
    const timer = window.setTimeout(async () => {
      const queue = letters.split("");
      let failed = false;
      await Promise.all(Array.from({ length: 3 }, async () => {
        while (queue.length && !cancelled) {
          const letter = queue.shift()!;
          try { await loadLetter(letter); } catch { failed = true; }
        }
      }));
      if (!cancelled) { setPending(false); setError(failed); }
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
    // loadLetter is recreated by the parent; requests are deduplicated there.
    // Restart only for a new query, scope or an explicit retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, letters, retry]);
  useEffect(() => setLimit(25), [query, letters]);
  const titleMatches = useMemo(() => findTopicResults(topics, query), [topics, query]);
  const verseMatches = useMemo(() => {
    const ids = new Set(topics.map(topic => topic.id));
    return findScriptureResults(Object.values(payloads).flat().filter(topic => ids.has(topic.id)), query);
  }, [topics, payloads, query]);
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
        <h3 id="scripture-results-heading" className="text-base font-bold">Scripture results <span className="text-xs font-normal text-[var(--color-text-muted,#2E5A7A)]">({verseMatches.length}{pending ? "+" : ""})</span></h3>
        <p className="mt-1 text-xs text-[var(--color-text-muted,#2E5A7A)]">Matching words in the original KJV Scripture text.</p>
        {pending && <p role="status" className="py-2 text-sm">Searching Scripture across topics…</p>}
        {error && <p role="alert" className="py-2 text-sm">Some Scripture could not be searched. <button type="button" onClick={() => setRetry(value => value + 1)} className="underline">Try again</button></p>}
        {!pending && !error && !verseMatches.length && <p className="py-2 text-sm">No Scripture text matches.</p>}
        {verseMatches.slice(0, limit).map((passage, i) => (
          <article key={`${passage.reference}-${i}`} className="border-b border-[var(--color-border-soft,#CCEBFF)] py-3">
            <a href={scriptureHref(passage.reference)} target="_blank" rel="noopener noreferrer" className="kg-focus inline-flex min-h-11 items-center text-sm font-bold underline">{passage.reference} <span className="ml-2 text-xs font-normal">KJV</span></a>
            <p className="text-sm leading-relaxed">{snippet(passage.text)}</p>
          </article>
        ))}
        {verseMatches.length > limit && <button type="button" onClick={() => setLimit(value => value + 25)} className="kg-focus min-h-11 py-2 text-sm font-bold underline">Show more Scripture results</button>}
      </section>
    </div>
  );
}
