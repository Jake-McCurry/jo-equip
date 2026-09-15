import type { MouseEvent } from "react";

type RelatedTopic = { sourceLabel: string; targetIds: string[] };
type TopicSummary = { id: string; title: string };

/** Preserve printed labels and expose each destination as a native topic link. */
export function TopicCrossReferences({ related, topics, onNavigate }: {
  related: RelatedTopic[];
  topics: TopicSummary[];
  onNavigate: (id: string) => void;
}) {
  const startUrl = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/knowing-god`;
  const linkClass = "kg-focus underline underline-offset-4 text-[var(--color-hero)] hover:text-[var(--color-action-warm)]";
  const href = (id: string) => id === "*" ? startUrl : `${startUrl}#topic=${encodeURIComponent(id)}`;
  const navigate = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onNavigate(id);
  };

  return <section aria-label="Related topics" className="mb-8 text-xl leading-relaxed">
    <p><strong>See </strong>{related.map((item, position) =>
      <span key={`${position}-${item.sourceLabel}`}>
        {item.targetIds.length === 1
          ? <a className={linkClass} href={href(item.targetIds[0])} onClick={event => navigate(event, item.targetIds[0])}>{item.sourceLabel}</a>
          : <>{item.sourceLabel} ({item.targetIds.map((id, i) =>
            <span key={id}>
              <a className={linkClass} href={href(id)} onClick={event => navigate(event, id)}>{id === "*" ? "All topics" : topics.find(topic => topic.id === id)?.title}</a>
              {i < item.targetIds.length - 1 ? "; " : ""}
            </span>)})</>}
        {position < related.length - 1 ? "; " : "."}
      </span>)}</p>
  </section>;
}