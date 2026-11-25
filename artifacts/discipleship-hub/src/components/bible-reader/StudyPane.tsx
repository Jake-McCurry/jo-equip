import { useRef, type KeyboardEvent, type ReactNode } from "react";

// Add new study tabs by extending this union and passing another entry in
// `tabs`; the tab list and keyboard behavior are generic.
export type StudyTab = "words" | "notes" | "commentary" | "xrefs" | "library";
export type StudyPaneTab = { id: StudyTab; label: string; content: ReactNode };

type Props = { tabs: StudyPaneTab[]; tab: StudyTab; onTab: (t: StudyTab) => void; idPrefix: string; compact?: boolean };

export function StudyPane({ tabs, tab, onTab, idPrefix, compact }: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const active = tabs.find(t => t.id === tab) ?? tabs[0];
  const onKey = (e: KeyboardEvent, i: number) => {
    const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const n = (next + tabs.length) % tabs.length;
    onTab(tabs[n].id);
    refs.current[n]?.focus();
  };
  return (
    <>
      {tabs.length > 1 && (
        <div role="tablist" aria-label="Study tools" className={`br-tabs ${compact ? "-mx-1 mb-3" : "px-3 pt-3"}`}>
          {tabs.map((t, i) => {
            const on = t.id === active.id;
            return (
              <button key={t.id} ref={el => { refs.current[i] = el; }} type="button" role="tab" id={`br-tab-${idPrefix}-${t.id}`}
                aria-selected={on} aria-controls={`br-tabpanel-${idPrefix}-${t.id}`} tabIndex={on ? 0 : -1}
                onClick={() => onTab(t.id)} onKeyDown={e => onKey(e, i)} className={`br-tab ${on ? "is-active" : ""}`}>
                {t.label}
              </button>
            );
          })}
        </div>
      )}
      <div role={tabs.length > 1 ? "tabpanel" : undefined} id={`br-tabpanel-${idPrefix}-${active.id}`}
        aria-labelledby={tabs.length > 1 ? `br-tab-${idPrefix}-${active.id}` : undefined}
        className={compact ? "" : "br-scroll min-h-0 flex-1 overflow-y-auto p-5"}>
        {active.content}
      </div>
    </>
  );
}
