import { Bookmark, Check, Clipboard, Copy, Printer } from "lucide-react";

type Props = {
  title: string;
  definition: string;
  resultCount: number;
  saved: boolean;
  copied: string;
  onSave: () => void;
  onCopy: (what: "topic" | "passages") => void;
};

export function TopicHeading({ title, definition, resultCount, saved, copied, onSave, onCopy }: Props) {
  const buttonClass = "kg-focus inline-flex min-h-11 min-w-0 items-center justify-center gap-1 whitespace-nowrap px-1 text-xs font-bold hover:underline underline-offset-4";
  return (
    <header className="mb-3 border-b border-[var(--color-border-soft,#CCEBFF)] pb-3">
      <div role="toolbar" aria-label="Topic actions" className="kg-no-print kg-sans mb-1 grid grid-cols-[auto_auto_auto_auto] items-center gap-1 text-[var(--color-text,#003A66)] sm:flex sm:gap-4">
        <button type="button" onClick={onSave} aria-pressed={saved} className={buttonClass}>
          {saved ? <Check size={14} aria-hidden="true" /> : <Bookmark size={14} aria-hidden="true" />}
          {saved ? "Saved" : "Save"}
        </button>
        <button type="button" onClick={() => onCopy("topic")} className={buttonClass} aria-label="Copy topic references">
          <Copy size={14} aria-hidden="true" />{copied === "topic" ? "Copied" : "Copy refs"}
        </button>
        <button type="button" onClick={() => onCopy("passages")} className={buttonClass} aria-label="Copy visible Scripture verses">
          <Clipboard size={14} aria-hidden="true" />{copied === "passages" ? "Copied" : "Copy verses"}
        </button>
        <button type="button" onClick={() => window.print()} className={buttonClass}>
          <Printer size={14} aria-hidden="true" />Print
        </button>
      </div>
      <h2 className="text-4xl text-[var(--color-hero,#006BB3)] md:text-6xl" style={{ fontFamily: "var(--font-display, 'Playfair Display', serif)" }}>
        {title}{" "}
        <span className="kg-sans inline-block whitespace-nowrap align-baseline text-xs font-normal text-[var(--color-text-muted,#2E5A7A)]">
          {resultCount} {resultCount === 1 ? "result" : "results"}
        </span>
      </h2>
      {definition && <p className="mt-2 text-lg italic text-[var(--color-text-muted,#2E5A7A)]">{definition}</p>}
    </header>
  );
}
