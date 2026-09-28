import { useRef, useState } from "react";
import { Download, FileJson, FileText, Upload } from "lucide-react";
import { exportStudyJson, exportStudyText, mergeStudy, parseBackup, type StudyData } from "./study-storage";
import { download, errMsg } from "./reader-utils";

type Props = { study: StudyData; onPersist: (next: StudyData) => void };

export function BackupPanel({ study, onPersist }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ name: string; data: StudyData } | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const stamp = () => new Date().toISOString().slice(0, 10);

  const exportFile = (kind: "json" | "txt") => {
    setError(""); setSuccess("");
    try {
      if (kind === "json") download(`jo-equip-bible-study-backup-${stamp()}.json`, exportStudyJson(study), "application/json");
      else download(`jo-equip-bible-study-readable-${stamp()}.txt`, exportStudyText(study), "text/plain");
    } catch (e) { setError(errMsg(e, "The export could not be created.")); }
  };

  const choose = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    setError(""); setSuccess(""); setPending(null);
    if (!file) return;
    try {
      const text = await file.text();
      setPending({ name: file.name, data: parseBackup(text) });
    } catch (err) {
      setError(`${file.name} could not be imported: ${errMsg(err, "it is not a valid JO EQUIP JSON backup.")} Only the JSON backup can be imported; the TXT file is for reading.`);
    }
  };

  const apply = (mode: "merge" | "replace") => {
    if (!pending) return;
    try {
      const next = mode === "merge" ? mergeStudy(study, pending.data) : pending.data;
      onPersist(next);
      setSuccess(`${mode === "merge" ? "Merged" : "Replaced with"} ${pending.name}. Saved in this browser: ${next.verses.length} verses, ${next.chapters.length} chapters.`);
      setPending(null);
    } catch (err) {
      setError(`Nothing was changed. ${errMsg(err, "This browser blocked saving to local storage.")}`);
    }
  };

  const counts = pending && {
    verses: pending.data.verses.length,
    bookmarks: pending.data.verses.filter(v => v.bookmark).length,
    highlights: pending.data.verses.filter(v => v.highlight).length,
    notes: pending.data.verses.filter(v => v.note.trim()).length,
    chapters: pending.data.chapters.length,
  };

  return (
    <section aria-labelledby="br-backup" className="br-card p-5">
      <h2 id="br-backup" className="text-lg">Backup and restore</h2>
      <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-muted)]">
        Your study is saved only in this browser on this device. It is not sent to JO EQUIP, and clearing site data or switching devices will lose it. Download a backup regularly.
      </p>
      <div className="mt-3 space-y-2">
        <button type="button" onClick={() => exportFile("json")} className="br-btn-outline w-full"><FileJson size={16} /> Download JSON backup (importable)</button>
        <button type="button" onClick={() => exportFile("txt")} className="br-btn-outline w-full"><FileText size={16} /> Download readable TXT (for printing)</button>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-muted)]">The TXT file lists your chapters, verses, highlights, and notes for reading or printing. Only the JSON backup can be imported back.</p>

      <input ref={input} type="file" accept="application/json,.json" onChange={choose} className="sr-only" id="br-import" />
      <button type="button" onClick={() => input.current?.click()} className="br-btn-primary mt-3 w-full"><Upload size={16} /> Import JSON backup</button>

      {counts && pending && (
        <div className="mt-3 rounded border border-[var(--color-border-control)] bg-[var(--color-surface-soft)] p-3 text-sm">
          <p className="font-bold break-all">{pending.name}</p>
          <ul className="mt-1 grid grid-cols-2 gap-x-3 text-[var(--color-text-muted)]">
            <li>{counts.verses} saved verses</li><li>{counts.chapters} chapters</li>
            <li>{counts.bookmarks} bookmarks</li><li>{counts.highlights} highlights</li><li>{counts.notes} notes</li>
          </ul>
          {(pending.data.verses.length > 0 || pending.data.chapters.length > 0) && (
            <ul className="mt-2 space-y-0.5 text-xs text-[var(--color-text)]" aria-label="Sample of items in this file">
              {pending.data.chapters.slice(0, 3).map(c => <li key={`c-${c.book}-${c.chapter}-${c.translation}`}>Chapter: {c.book} {c.chapter} ({c.translation.toUpperCase()})</li>)}
              {pending.data.verses.slice(0, 4).map(v => <li key={`v-${v.book}-${v.chapter}-${v.verse}-${v.translation}`}>Verse: {v.book} {v.chapter}:{v.verse} ({v.translation.toUpperCase()}){v.highlight ? `, ${v.highlight}` : ""}{v.bookmark ? ", bookmarked" : ""}{v.note.trim() ? ", note" : ""}</li>)}
              {pending.data.chapters.length + pending.data.verses.length > Math.min(3, pending.data.chapters.length) + Math.min(4, pending.data.verses.length) && <li className="text-[var(--color-text-muted)]">and more</li>}
            </ul>
          )}
          <p className="mt-2">Merge keeps your current study and adds this file. Replace discards the current study in this browser.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => apply("merge")} className="br-btn-primary">Merge</button>
            <button type="button" onClick={() => { if (window.confirm("Replace your current saved study with this file?")) apply("replace"); }} className="br-btn-outline">Replace</button>
            <button type="button" onClick={() => setPending(null)} className="br-link">Cancel</button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm font-semibold text-[var(--color-action-warm)]">{error}</p>}
      {success && <p role="status" className="mt-3 flex items-start gap-1.5 text-sm font-semibold text-[#1c6a31]"><Download size={15} className="mt-0.5 shrink-0" />{success}</p>}
    </section>
  );
}
