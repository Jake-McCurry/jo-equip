// Parses Alexander Maclaren's Expositions of Holy Scripture: The Book of Psalms
// I. to XLIX. from the Project Gutenberg transcription (eBook #7925, which also
// holds the next Psalms volume). Used by scripts/generate-sermons.mjs.
//
// splitMaclaren() and maclarenWords() must match split_sermons() and the word
// count in scripts/verify-maclaren-sermons.py: the generator refuses a sermon
// whose word count differs from the verified one.

const ENTRY = /^(.*?) \((.*)\)$/;

/** [{ title, ref, lines }] for the first volume, in contents order; lines start after the title line. */
export function splitMaclaren(text) {
  const lines = text.replace(/\r/g, "").split("\n");
  const start = lines.findIndex(l => l.trim() === "CONTENTS") + 1;
  const entries = [];
  let cur = [];
  for (const l of lines.slice(start)) {
    if (l.startsWith("    ") && entries.length) break;
    if (!l.trim()) {
      if (cur.length) {
        const m = ENTRY.exec(cur.join(" "));
        if (!m) break;
        entries.push({ title: m[1], ref: m[2] });
        cur = [];
      }
      continue;
    }
    cur.push(l.trim());
  }
  const stop = lines.findIndex(l => l.startsWith("VOLUME II:"));
  const pos = [];
  let i = start + entries.length;
  for (const e of entries) {
    while (lines[i].trim() !== e.title) i++;
    pos.push(i++);
  }
  pos.push(stop);
  return entries.map((e, k) => ({ ...e, lines: lines.slice(pos[k] + 1, pos[k + 1]) }));
}

const clean = t => t.replace(/_/g, " ").replace(/(\w)-(?=\w)/g, "$1");
export const maclarenWords = lines => (clean(lines.join("\n")).match(/[A-Za-z]+/g) ?? []).length;

function romanNum(s) {
  const v = { i: 1, v: 5, x: 10, l: 50, c: 100 };
  let n = 0;
  for (let i = 0; i < s.length; i++) n += v[s[i]] < (v[s[i + 1]] ?? 0) ? -v[s[i]] : v[s[i]];
  return n;
}
const BOOK_NAMES = { psalm: "Psalms", psalms: "Psalms", rev: "Revelation" };
/**
 * The contents reference -> { refLine, revised }.
 * "Psalm i. 1, 2; cl. 6" -> "Psalms 1:1,2 and Psalms 150:6"; "Psalm xxxi. 2, 3, R.V." -> revised.
 */
export function contentsRef(ref) {
  const revised = /,\s*R\.V\.$/.test(ref);
  let book = null;
  const parts = ref.replace(/,\s*R\.V\.$/, "").split(/;\s*/).map(part => {
    const m = /^(?:([A-Za-z]+)\.? )?([ivxlc]+)\.? ([\d,\-\s]+)$/.exec(part.trim());
    if (!m) throw new Error(`Maclaren: reference "${ref}"`);
    if (m[1]) book = BOOK_NAMES[m[1].toLowerCase()] ?? m[1];
    if (!book) throw new Error(`Maclaren: reference "${ref}" has no book`);
    return `${book} ${romanNum(m[2])}:${m[3].replace(/\s+/g, "")}`;
  });
  return { refLine: parts.join(" and "), revised };
}

const plain = s => s.replace(/_/g, "").replace(/\s+/g, " ").trim();
/** The transcription's "--" for a dash. */
const dashes = t => t.replace(/\s*--\s*/g, "—");
const indent = l => /^ */.exec(l)[0].length;
const ATTRIBUTION = /\s*(?:--)?\s*(?:PSALMS?|REV\.)\s+[ivxlc]+\.?\s[\d,\-\s]+(?:\(R\.V\.\))?\.?$/;

/** { quote, blocks }: the texts printed before the sermon, and the body (paragraphs and indented verse). */
export function parseMaclaren(title, lines) {
  const groups = [];
  let cur = [];
  for (const l of [...lines, ""]) {
    if (!l.trim()) { if (cur.length) groups.push(cur); cur = []; } else cur.push(l);
  }
  const texts = [];
  let k = 0;
  for (; k < groups.length && groups[k].every(l => indent(l) >= 2); k++) {
    const t = plain(groups[k].join(" "));
    if (!ATTRIBUTION.test(t)) throw new Error(`Maclaren "${title}": text without a reference`);
    texts.push(t.replace(ATTRIBUTION, "").trim());
  }
  if (!texts.length) throw new Error(`Maclaren "${title}": no text`);
  const unquote = t => t.replace(/^'(.*)'$/, "$1");
  const quote = texts.length === 1 ? unquote(texts[0]) : texts.join(" ");
  const blocks = groups.slice(k).map(g =>
    g.every(l => indent(l) >= 2) ? { q: g.map(l => dashes(plain(l))) } : { p: dashes(plain(g.join(" "))) });
  return { quote: dashes(quote), blocks };
}
