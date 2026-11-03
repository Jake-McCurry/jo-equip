import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { devotionalGuideCategories } from "../../data/knowing-god/introduction/devotional-guide.ts";
import { devotionalTopicKey } from "./devotional-topics";

type GroupTopic = { id: string; title: string; passageCount: number; letter: string };

type Props<T extends GroupTopic> = {
  topics: T[];
  /** Existing filtered (searched) results; null when not searching. */
  filtered: T[] | null;
  query: string;
  selectedId: string;
  onOpen: (topic: T) => void;
};

export function DevotionalTopicGroups<T extends GroupTopic>({ topics, filtered, query, selectedId, onOpen }: Props<T>) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => {
    const byKey = new Map<string, T>();
    for (const topic of topics) {
      const key = devotionalTopicKey(topic.title);
      if (!byKey.has(key)) byKey.set(key, topic);
    }
    return devotionalGuideCategories.map((category, index) => ({
      id: `devotional-group-${index}`,
      heading: category.heading,
      entries: category.entries.map((entry, entryIndex) => ({
        key: `${index}-${entryIndex}`,
        label: entry.topic,
        topic: byKey.get(devotionalTopicKey(entry.topic)),
      })),
    }));
  }, [topics]);

  const q = query.trim().toLocaleLowerCase();
  const matchIds = useMemo(() => filtered ? new Set(filtered.map(t => t.id)) : null, [filtered]);

  const visible = groups.map(group => {
    if (!q || !matchIds) return { ...group, shown: group.entries, headingMatch: false };
    const headingMatch = group.heading.toLocaleLowerCase().includes(q);
    const shown = headingMatch ? group.entries : group.entries.filter(entry => entry.topic && matchIds.has(entry.topic.id));
    return { ...group, shown, headingMatch };
  }).filter(group => !q || group.headingMatch || group.shown.length > 0);

  if (q && visible.length === 0) {
    return <p className="kg-sans py-6 text-center text-sm text-[var(--color-text-muted,#2E5A7A)]">No devotional groups or topics match that search.</p>;
  }

  return <div data-devotional-groups>
    {visible.map(group => {
      const expanded = q ? true : Boolean(open[group.id]);
      return <div key={group.id} className="border-b border-[var(--color-border-soft,#CCEBFF)]">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={group.id}
          disabled={Boolean(q)}
          onClick={() => setOpen(previous => ({ ...previous, [group.id]: !previous[group.id] }))}
          className="kg-focus kg-sans flex min-h-11 w-full items-center gap-2 py-2 text-left text-xs font-bold uppercase tracking-[.14em] text-[var(--color-hero,#006BB3)] hover:text-[var(--color-structure,#003A66)] disabled:cursor-default"
        >
          <ChevronRight size={14} aria-hidden="true" className={`shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`}/>
          <span className="flex-1">{group.heading}</span>
          <span className="text-[var(--color-text-muted,#2E5A7A)] font-normal tracking-normal">{group.shown.length}</span>
        </button>
        {expanded && <ul id={group.id} className="mb-2 ml-4 border-l border-[var(--color-border-soft,#CCEBFF)]">
          {group.shown.map(entry => {
            const topic = entry.topic;
            if (!topic) {
              return <li key={entry.key} className="kg-sans flex min-h-11 items-center px-3 text-sm italic text-[var(--color-text-muted,#2E5A7A)]">{entry.label} (not found in index)</li>;
            }
            const active = selectedId === topic.id;
            return <li key={entry.key}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onOpen(topic)}
                className={`kg-focus flex min-h-11 w-full items-center justify-between border-l-4 px-3 py-2 text-left text-base ${active ? "border-[var(--color-action-warm,#C45100)] bg-[var(--color-selected-warm,#FFEADB)] text-[var(--color-text,#003A66)]" : "border-transparent text-[var(--color-text,#003A66)] hover:bg-[var(--color-surface-soft,#E6F5FF)]"}`}
              >
                <span>{topic.title}</span>
                <span className="kg-sans text-xs text-[var(--color-text-muted,#2E5A7A)]">{topic.passageCount}</span>
              </button>
            </li>;
          })}
        </ul>}
      </div>;
    })}
  </div>;
}
