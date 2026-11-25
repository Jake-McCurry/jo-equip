import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { BOOKS } from "./catalog";
import { COMMENTARIES, decodeCode, type CommentaryId, type Para, type Seg } from "./commentary-format";
import { loadBookIntro, loadCommentaryChapter } from "./commentary-data";
import { refLabel, type Location } from "./reader-utils";
import { Header, LoadState, useLoad } from "./WordStudyPanel";

type LinkProps = { loc: Location; hrefFor: (l: Location) => string; onGo: (l: Location) => void };

type Props = LinkProps & {
  baseUrl: string;
  verse?: number;
  commentary: CommentaryId;
  onCommentary: (id: CommentaryId) => void;
  onVerse: (v: number | undefined) => void;
  onClose?: () => void;
};

/** "John 3:16", "John 3:16–18", "Isaiah 9:6–10:2", "Psalms 23". */
export function rangeLabel(from: number, to?: number) {
  const a = decodeCode(from);
  const name = BOOKS[a.book - 1]?.name ?? "";
  if (!a.verse) return `${name} ${a.chapter}`;
  if (!to || to === from) return refLabel(name, a.chapter, a.verse);
  const z = decodeCode(to);
  return z.chapter === a.chapter ? `${name} ${a.chapter}:${a.verse}–${z.verse}` : `${name} ${a.chapter}:${a.verse}–${z.chapter}:${z.verse}`;
}

export const locationOf = (from: number, translation: Location["translation"]): Location => {
  const r = decodeCode(from);
  return { book: BOOKS[r.book - 1]?.name ?? "", chapter: r.chapter, verse: r.verse || undefined, translation };
};

/** Plain left clicks navigate inside the reader; modified clicks keep normal link behavior. */
export const inReader = (go: () => void) => (e: MouseEvent) => {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  e.preventDefault(); go();
};

function SegView({ seg, link }: { seg: Seg; link: LinkProps }) {
  if (typeof seg === "string") return <>{seg}</>;
  const [text, flags, from, to] = seg;
  let node: ReactNode = text;
  if (flags & 4) node = <span className="br-smallcaps">{node}</span>;
  if (flags & 2) node = <strong>{node}</strong>;
  if (flags & 1) node = <em>{node}</em>;
  if (from === undefined) return <>{node}</>;
  const target = locationOf(from, link.loc.translation);
  return (
    <a href={link.hrefFor(target)} onClick={inReader(() => link.onGo(target))} className="br-cm-ref" title={rangeLabel(from, to)}>
      {node}
    </a>
  );
}

export function Paragraphs({ paras, link }: { paras: Para[]; link: LinkProps }) {
  return (
    <div className="br-cm">
      {paras.map((p, i) => {
        const segs = p.slice(1) as Seg[];
        const body = segs.map((s, j) => <SegView key={j} seg={s} link={link} />);
        if (p[0] === "h") return <h3 key={i}>{body}</h3>;
        if (p[0] === "q") return <blockquote key={i}>{body}</blockquote>;
        if (p[0] === "n") return <p key={i} className="br-cm-note"><span className="font-bold">Note: </span>{body}</p>;
        return <p key={i}>{body}</p>;
      })}
    </div>
  );
}

export function CommentaryPanel({ baseUrl, loc, verse, commentary, onCommentary, onVerse, onClose, hrefFor, onGo }: Props) {
  const meta = COMMENTARIES.find(c => c.id === commentary)!;
  const { data, loading, error, retry } = useLoad(() => loadCommentaryChapter(baseUrl, commentary, loc.book, loc.chapter), [baseUrl, commentary, loc.book, loc.chapter]);
  const top = useRef<HTMLDivElement>(null);
  // Long comments: start each verse or commentary at the top of the pane.
  useEffect(() => {
    const scroller = top.current?.closest(".br-scroll, .br-sheet");
    if (scroller) scroller.scrollTop = 0;
  }, [verse, commentary, loc.book, loc.chapter]);
  const link = { loc, hrefFor, onGo };
  const bookIndex = BOOKS.findIndex(b => b.name === loc.book) + 1;
  const here = verse ? bookIndex * 1_000_000 + loc.chapter * 1_000 + verse : 0;
  const entries = data?.data.e.filter(([from, to]) => here >= from && here <= to) ?? [];

  return (
    <div ref={top} className="flex flex-col">
      <Header eyebrow="Commentary" onClose={onClose ?? (verse ? () => onVerse(undefined) : undefined)} label={onClose ? "Close commentary" : "Clear the selected verse"}
        title={refLabel(loc.book, loc.chapter, verse)} />
      <div role="group" aria-label="Choose a commentary" className="br-seg mt-3">
        {COMMENTARIES.map(c => (
          <button key={c.id} type="button" aria-pressed={c.id === commentary} onClick={() => onCommentary(c.id)} className="br-seg-btn">
            {c.name === "Jamieson-Fausset-Brown" ? <><span aria-hidden="true">JFB</span><span className="sr-only">Jamieson-Fausset-Brown</span></> : c.name}
          </button>
        ))}
      </div>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">{meta.full}</p>
      <LoadState loading={loading} error={error} retry={retry} label="Loading commentary" />
      {!loading && !error && data === null && (
        <p className="mt-4 rounded border border-[var(--color-border-soft)] bg-[var(--color-surface-soft)] p-3 text-[15px] font-semibold">
          Barnes&rsquo; Notes cover the New Testament only. Choose Matthew Henry or JFB for {loc.book}.
        </p>
      )}
      {data && verse && (
        entries.length ? entries.map(([from, to, paras]) => (
          <section key={from} className="mt-4" aria-label={`${meta.name} on ${rangeLabel(from, to)}`}>
            {to !== from && <p className="br-label">On {rangeLabel(from, to)}</p>}
            <Paragraphs paras={paras} link={link} />
          </section>
        )) : (
          <p className="mt-4 text-[15px] font-semibold">{meta.name} has no comment on verse {verse}. Choose a section below or another commentary.</p>
        )
      )}
      {data && (!verse || !entries.length) && <ChapterOverview key={`${commentary}|${loc.book}`} baseUrl={baseUrl} commentary={commentary} data={data} link={link} onVerse={onVerse} showIntro={!verse} />}
      {data && verse && entries.length > 0 && (
        <button type="button" onClick={() => onVerse(undefined)} className="br-link mt-4 self-start text-sm">All comments on {loc.book} {loc.chapter}</button>
      )}
      <CommentaryCredits />
    </div>
  );
}

function ChapterOverview({ baseUrl, commentary, data, link, onVerse, showIntro }: { baseUrl: string; commentary: CommentaryId; data: NonNullable<Awaited<ReturnType<typeof loadCommentaryChapter>>>; link: LinkProps; onVerse: (v: number) => void; showIntro: boolean }) {
  const { loc } = link;
  const [bookOpen, setBookOpen] = useState(false);
  const intro = useLoad(() => (bookOpen ? loadBookIntro(baseUrl, commentary, loc.book) : Promise.resolve(null)), [bookOpen, baseUrl, commentary, loc.book]);
  const sections = data.data.e;
  return (
    <div className="mt-4">
      {showIntro && data.data.i && (
        <section aria-label="Chapter introduction">
          <h3 className="br-label">Chapter introduction</h3>
          <Paragraphs paras={data.data.i} link={link} />
        </section>
      )}
      {showIntro && data.hasIntro && (
        <div className="mt-3">
          <button type="button" aria-expanded={bookOpen} onClick={() => setBookOpen(o => !o)} className="br-btn-outline">
            {bookOpen ? "Hide" : "Read"} the introduction to {loc.book}
          </button>
          {bookOpen && <LoadState loading={intro.loading} error={intro.error} retry={intro.retry} label="Loading book introduction" />}
          {bookOpen && intro.data && <section aria-label={`Introduction to ${loc.book}`} className="mt-2"><Paragraphs paras={intro.data} link={link} /></section>}
        </div>
      )}
      {sections.length > 0 && (
        <>
          <h3 className="br-label mt-5">Comments in {loc.book} {loc.chapter}</h3>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {sections.map(([from, to]) => {
              const a = from % 1000, z = to % 1000;
              return (
                <li key={from}>
                  <button type="button" onClick={() => onVerse(a)} className="br-chip br-chip-btn" aria-label={`Read the comment on ${rangeLabel(from, to)}`}>
                    {z > a ? `${a}–${z}` : a}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

export function CommentaryCredits() {
  return (
    <p className="mt-5 border-t border-[var(--color-border-soft)] pt-3 text-xs leading-relaxed text-[var(--color-text-muted)]">
      Commentaries: Matthew Henry&rsquo;s Complete Commentary, Jamieson-Fausset-Brown, and Barnes&rsquo; Notes on the New Testament
      (all public domain; digital texts from the{" "}
      <a className="underline" href="https://crosswire.org/sword/modules/" target="_blank" rel="noopener noreferrer">CrossWire Bible Society</a> SWORD modules).
      Scripture quoted in these commentaries is from the KJV.
    </p>
  );
}
