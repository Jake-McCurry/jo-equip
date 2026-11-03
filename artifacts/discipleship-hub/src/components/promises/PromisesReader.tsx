import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { BookOpen, Bookmark, BookmarkCheck, ChevronDown, Copy, ExternalLink, Menu, Printer, RotateCw, Share2, X } from "lucide-react";
import {
  bibleHref, copyText, findTopic, hashToView, linkifyParts, loadSaved, splitPassage, storeSaved,
  toggleSaved, topicCopyText, unwrap, validateBook, viewToHash,
  type Block, type PromiseBook, type View,
} from "./promise-utils";
import "./promises.css";

type Props = { baseUrl: string };

function headerOffset(): number {
  const el = document.querySelector("body > div.sticky") as HTMLElement | null;
  return el ? el.getBoundingClientRect().height : 0;
}

function PassageBlock({ block, baseUrl }: { block: Block; baseUrl: string }) {
  const { quote } = splitPassage(block);
  const href = bibleHref(baseUrl, block);
  return (
    <figure className="pg-passage">
      <blockquote className="pg-quote">{quote}</blockquote>
      <figcaption className="pg-cite">
        <span aria-hidden="true">—</span>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="pg-ref" data-testid="link-bible-ref">
            {block.reference}
            <ExternalLink size={13} aria-hidden="true" />
            <span className="pg-sr">(opens the NET Bible reader in a new tab)</span>
          </a>
        ) : <span className="pg-ref">{block.reference}</span>}
        {block.translation && <span className="pg-tr">{block.translation}</span>}
      </figcaption>
      {block.referenceNote && <p className="pg-note">{block.referenceNote}</p>}
    </figure>
  );
}

function Blocks({ blocks, baseUrl }: { blocks: Block[]; baseUrl: string }) {
  return (
    <>
      {blocks.map((b, i) =>
        b.kind === "passage" ? <PassageBlock key={i} block={b} baseUrl={baseUrl} />
        : b.kind === "heading" ? <h3 key={i} className="pg-h3">{unwrap(b.text)}</h3>
        : <p key={i} className="pg-p">{unwrap(b.text)}</p>
      )}
    </>
  );
}

export default function PromisesReader({ baseUrl }: Props) {
  const [book, setBook] = useState<PromiseBook | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [view, setView] = useState<View>({ kind: "intro" });
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [indexOpen, setIndexOpen] = useState(true);
  const [saved, setSaved] = useState<string[]>([]);
  const [status, setStatus] = useState<{ msg: string; tone: "ok" | "warn" } | null>(null);
  const readingRef = useRef<HTMLDivElement>(null);
  const statusTimer = useRef<number | undefined>(undefined);

  const flash = useCallback((msg: string, tone: "ok" | "warn" = "ok") => {
    setStatus({ msg, tone });
    window.clearTimeout(statusTimer.current);
    statusTimer.current = window.setTimeout(() => setStatus(null), tone === "warn" ? 7000 : 3500);
  }, []);

  useEffect(() => {
    const r = loadSaved();
    setSaved(r.ids);
    if (r.error) flash(r.error, "warn");
  }, [flash]);

  useEffect(() => {
    const ctl = new AbortController();
    setLoadError(null);
    fetch(`${baseUrl.replace(/\/$/, "")}/promises/book.json`, { signal: ctl.signal })
      .then(r => { if (!r.ok) throw new Error(`The promises could not be loaded (status ${r.status}).`); return r.json(); })
      .then(d => setBook(validateBook(d)))
      .catch(e => { if (!ctl.signal.aborted) setLoadError(e instanceof Error ? e.message : "The promises could not be loaded."); });
    return () => ctl.abort();
  }, [baseUrl, attempt]);

  const applyView = useCallback((v: View, b: PromiseBook) => {
    setView(v);
    const gid = v.kind === "group" ? v.groupId : v.kind === "topic" ? findTopic(b, v.topicId)?.group.id : undefined;
    if (gid) setOpenGroups(prev => new Set(prev).add(gid));
  }, []);

  useEffect(() => {
    if (!book) return;
    const sync = () => applyView(hashToView(window.location.hash, book), book);
    sync();
    if (window.location.hash && window.location.hash !== "#introduction" && window.matchMedia("(max-width: 899px)").matches) setIndexOpen(false);
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => { window.removeEventListener("popstate", sync); window.removeEventListener("hashchange", sync); };
  }, [book, applyView]);

  const scrollToReading = useCallback(() => {
    requestAnimationFrame(() => {
      const el = readingRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - headerOffset() - 8;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      el.focus({ preventScroll: true });
    });
  }, []);

  const go = useCallback((v: View) => {
    if (!book) return;
    const hash = viewToHash(v);
    if (window.location.hash !== hash) history.pushState(null, "", hash);
    applyView(v, book);
    if (window.matchMedia("(max-width: 899px)").matches) setIndexOpen(false);
    scrollToReading();
  }, [book, applyView, scrollToReading]);

  const toggleGroup = (id: string) => setOpenGroups(prev => {
    const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n;
  });

  const onSave = (id: string) => {
    const next = toggleSaved(saved, id);
    setSaved(next);
    const err = storeSaved(next);
    if (err) flash(err, "warn"); else flash(next.includes(id) ? "Saved to your study." : "Removed from your study.");
  };

  const onCopy = async (text: string) => {
    const ok = await copyText(text);
    flash(ok ? "Passages copied with references." : "Your browser blocked clipboard access. Select the text and copy it manually.", ok ? "ok" : "warn");
  };

  const onShare = async (title: string) => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title, url }); return; }
      catch (e) { if (e instanceof DOMException && e.name === "AbortError") return; }
    }
    const ok = await copyText(url);
    flash(ok ? "Link copied to clipboard." : `Copy this link: ${url}`, ok ? "ok" : "warn");
  };

  const current = useMemo(() => (book && view.kind === "topic" ? findTopic(book, view.topicId) : null), [book, view]);
  const savedTopics = useMemo(() => (book ? saved.map(id => findTopic(book, id)).filter((x): x is NonNullable<typeof x> => !!x) : []), [book, saved]);

  if (loadError) {
    return (
      <div className="pg-root"><div className="pg-state" role="alert">
        <h1 className="pg-h1">God’s Promises for Hope</h1>
        <p>{loadError}</p>
        <button type="button" className="pg-btn pg-btn--primary" onClick={() => { setBook(null); setAttempt(a => a + 1); }} data-testid="button-retry">
          <RotateCw size={16} aria-hidden="true" /> Try again
        </button>
      </div></div>
    );
  }
  if (!book) {
    return (
      <div className="pg-root" aria-busy="true"><div className="pg-layout">
        <div className="pg-index pg-skel-col">{Array.from({ length: 8 }, (_, i) => <div key={i} className="pg-skel" />)}</div>
        <div className="pg-reading"><div className="pg-skel pg-skel--title" />{Array.from({ length: 5 }, (_, i) => <div key={i} className="pg-skel pg-skel--line" />)}<span className="pg-sr">Loading promises</span></div>
      </div></div>
    );
  }

  const actionBar = (title: string, copy?: string, saveId?: string) => (
    <div className="pg-actions" role="toolbar" aria-label="Reading actions">
      {saveId && (
        <button type="button" className={`pg-btn ${saved.includes(saveId) ? "pg-btn--on" : ""}`} aria-pressed={saved.includes(saveId)} onClick={() => onSave(saveId)} data-testid="button-save-study">
          {saved.includes(saveId) ? <BookmarkCheck size={16} aria-hidden="true" /> : <Bookmark size={16} aria-hidden="true" />}
          {saved.includes(saveId) ? "Saved" : "Save study"}
        </button>
      )}
      {copy && (
        <button type="button" className="pg-btn" onClick={() => onCopy(copy)} data-testid="button-copy-passages">
          <Copy size={16} aria-hidden="true" /> Copy passages
        </button>
      )}
      <span className="pg-actions__icons">
        <button type="button" className="pg-icon" onClick={() => window.print()} aria-label="Print this reading" title="Print" data-testid="button-print"><Printer size={17} aria-hidden="true" /></button>
        <button type="button" className="pg-icon" onClick={() => onShare(title)} aria-label="Share this reading" title="Share" data-testid="button-share"><Share2 size={17} aria-hidden="true" /></button>
      </span>
    </div>
  );

  let reading: ReactNode;
  if (view.kind === "topic" && current) {
    reading = (
      <article>
        <p className="pg-eyebrow" data-testid="text-group-name">{current.group.title}</p>
        <h1 className="pg-h1" data-testid="text-topic-title">{current.topic.title}</h1>
        {actionBar(`${current.topic.title} | Promises of God`, topicCopyText(current.group.title, current.topic), current.topic.id)}
        <Blocks blocks={current.topic.blocks} baseUrl={baseUrl} />
      </article>
    );
  } else if (view.kind === "group") {
    const g = book.groups.find(x => x.id === view.groupId)!;
    reading = (
      <article>
        <p className="pg-eyebrow">Promises of God</p>
        <h1 className="pg-h1">{g.title}</h1>
        {actionBar(`${g.title} | Promises of God`)}
        <p className="pg-lede">{g.description}</p>
        <Blocks blocks={g.preamble} baseUrl={baseUrl} />
        <ol className="pg-topiclist">
          {g.topics.map(t => (
            <li key={t.id}><a href={viewToHash({ kind: "topic", topicId: t.id })} onClick={e => { e.preventDefault(); go({ kind: "topic", topicId: t.id }); }} data-testid={`link-group-topic-${t.id}`}>
              <span>{t.title}</span><span className="pg-count">{t.blocks.length}</span>
            </a></li>
          ))}
        </ol>
      </article>
    );
  } else if (view.kind === "saved") {
    reading = (
      <article>
        <p className="pg-eyebrow">Promises of God</p>
        <h1 className="pg-h1">Saved study</h1>
        {savedTopics.length === 0 ? (
          <div className="pg-empty">
            <Bookmark size={28} aria-hidden="true" />
            <p>Nothing saved yet. Open any topic and choose <strong>Save study</strong> to keep it here on this device.</p>
          </div>
        ) : (
          <ul className="pg-topiclist">
            {savedTopics.map(({ group, topic }) => (
              <li key={topic.id} className="pg-saved-row">
                <a href={viewToHash({ kind: "topic", topicId: topic.id })} onClick={e => { e.preventDefault(); go({ kind: "topic", topicId: topic.id }); }} data-testid={`link-saved-${topic.id}`}>
                  <span><small className="pg-eyebrow">{group.title}</small><br />{topic.title}</span>
                </a>
                <button type="button" className="pg-icon" aria-label={`Remove ${topic.title} from saved study`} onClick={() => onSave(topic.id)} data-testid={`button-unsave-${topic.id}`}><X size={16} aria-hidden="true" /></button>
              </li>
            ))}
          </ul>
        )}
      </article>
    );
  } else if (view.kind === "copyright") {
    reading = (
      <article className="pg-copyright">
        <h1 className="pg-h1">Copyright</h1>
        {book.publication.slice(1, 7).map((b, i) => (
          <p key={i} className="pg-p">
            {linkifyParts(unwrap(b.text)).map((part, j) => part.href
              ? <a key={j} href={part.href} target="_blank" rel="noopener noreferrer">{part.text}</a>
              : <span key={j}>{part.text}</span>)}
          </p>
        ))}
      </article>
    );
  } else {
    reading = (
      <article>
        <p className="pg-eyebrow">Promises of God</p>
        <h1 className="pg-h1" data-testid="text-intro-title">{book.title}</h1>
        {actionBar(`${book.title} | Promises of God`)}
        <Blocks blocks={book.introduction} baseUrl={baseUrl} />
      </article>
    );
  }

  const isTopic = (id: string) => view.kind === "topic" && view.topicId === id;

  return (
    <div className="pg-root" data-source-title={book.sourceTitle}>
      <button type="button" className="pg-indextoggle" aria-expanded={indexOpen} aria-controls="pg-index" onClick={() => setIndexOpen(o => !o)} data-testid="button-toggle-index">
        {indexOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />} Index
      </button>
      <div className="pg-layout">
        <nav id="pg-index" className={`pg-index ${indexOpen ? "is-open" : ""}`} aria-label="Promises of God index">
          <p className="pg-index__title">Promises of God</p>
          <a href="#introduction" className={`pg-introbtn ${view.kind === "intro" ? "is-current" : ""}`} aria-current={view.kind === "intro" ? "page" : undefined}
            onClick={e => { e.preventDefault(); go({ kind: "intro" }); }} data-testid="link-introduction">
            <BookOpen size={18} aria-hidden="true" /> Introduction
          </a>
          <ul className="pg-groups">
            {book.groups.map(g => {
              const open = openGroups.has(g.id);
              return (
                <li key={g.id} className="pg-group">
                  <div className="pg-group__row">
                    <a href={viewToHash({ kind: "group", groupId: g.id })} className={`pg-group__name ${view.kind === "group" && view.groupId === g.id ? "is-current" : ""}`}
                      onClick={e => { e.preventDefault(); setOpenGroups(p => new Set(p).add(g.id)); go({ kind: "group", groupId: g.id }); }} data-testid={`link-group-${g.id}`}>
                      {g.title} <span className="pg-count">{g.topics.length}</span>
                    </a>
                    <button type="button" className="pg-icon" aria-expanded={open} aria-controls={`pg-g-${g.id}`} aria-label={`${open ? "Collapse" : "Expand"} ${g.title}`} onClick={() => toggleGroup(g.id)} data-testid={`button-expand-${g.id}`}>
                      <ChevronDown size={18} aria-hidden="true" className={open ? "pg-rot" : ""} />
                    </button>
                  </div>
                  <ul id={`pg-g-${g.id}`} className="pg-topics" hidden={!open}>
                    {g.topics.map(t => (
                      <li key={t.id}>
                        <a href={viewToHash({ kind: "topic", topicId: t.id })} className={isTopic(t.id) ? "is-current" : ""} aria-current={isTopic(t.id) ? "page" : undefined}
                          onClick={e => { e.preventDefault(); go({ kind: "topic", topicId: t.id }); }} data-testid={`link-topic-${t.id}`}>
                          {t.title}
                          {saved.includes(t.id) && <BookmarkCheck size={14} aria-label="saved" />}
                        </a>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
          <a href="#saved" className={`pg-savedlink ${view.kind === "saved" ? "is-current" : ""}`} onClick={e => { e.preventDefault(); go({ kind: "saved" }); }} data-testid="link-saved-study">
            <Bookmark size={16} aria-hidden="true" /> Saved study <span className="pg-count" data-testid="text-saved-count">{saved.length}</span>
          </a>
          <div className="pg-index__foot">
            <a href="#copyright" onClick={e => { e.preventDefault(); go({ kind: "copyright" }); }} data-testid="link-copyright">Copyright</a>
            <span>
              <button type="button" className="pg-icon" onClick={() => window.print()} aria-label="Print current reading" data-testid="button-index-print"><Printer size={16} aria-hidden="true" /></button>
              <button type="button" className="pg-icon" onClick={() => onShare("Promises of God")} aria-label="Share current reading" data-testid="button-index-share"><Share2 size={16} aria-hidden="true" /></button>
            </span>
          </div>
        </nav>
        <div ref={readingRef} tabIndex={-1} className="pg-reading" data-testid="region-reading">{reading}</div>
      </div>
      <div className={`pg-status ${status ? "is-on" : ""} ${status?.tone === "warn" ? "is-warn" : ""}`} role="status" aria-live="polite">{status?.msg}</div>
    </div>
  );
}
