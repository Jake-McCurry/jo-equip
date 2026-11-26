// Parses John Wesley's "Sermons on Several Occasions" from the Project Gutenberg
// transcriptions of The Works of the Rev. John Wesley (Bristol: William Pine,
// 1771), volumes 1–4. Used by scripts/generate-sermons.mjs.
//
// splitSermons() and sermonWords() must match split_sermons() and the word count
// in scripts/verify-wesley-sermons.py: the generator refuses a sermon whose word
// count differs from the verified one.

const HEADING = /^\s+SERMON ([IVXL]+)\.(\[\d+\]|¹)?\s*$/;
const END = /^\s*(?:THE END OF THE|The End of the)\b|^\s+ADVICE\s*$|^\s+Footnotes\.\s*$|^\*\*\* END OF/;

export function roman(s) {
  const v = { I: 1, V: 5, X: 10, L: 50, C: 100 };
  let n = 0;
  for (let i = 0; i < s.length; i++) n += v[s[i]] < (v[s[i + 1]] ?? 0) ? -v[s[i]] : v[s[i]];
  return n;
}

/** Map of sermon number -> lines, heading line first. The contents list comes first; the body heading is the last occurrence. */
export function splitSermons(text) {
  const lines = text.replace(/\r/g, "").split("\n");
  const last = new Map();
  lines.forEach((l, i) => { const m = HEADING.exec(l); if (m) last.set(roman(m[1]), i); });
  const starts = [...last].map(([n, i]) => [i, n]).sort((a, b) => a[0] - b[0]);
  const out = new Map();
  starts.forEach(([i, n], k) => {
    const stop = k + 1 < starts.length ? starts[k + 1][0] : lines.length;
    let j = i + 1;
    while (j < stop && !END.test(lines[j])) j++;
    out.set(n, lines.slice(i, j));
  });
  return out;
}

const clean = t => t.replace(/\[\d+\]|[¹²³⁴⁵⁶⁷⁸⁹⁰♦_|]/g, " ").replace(/[\u2010\u2011\u00ad]/g, "-").replace(/(\w)-(?=\w)/g, "$1");
export const sermonWords = lines => (clean(lines.slice(1).join("\n")).match(/[A-Za-z]+/g) ?? []).length;

/** "Footnotes." section at the end of volumes 1–3: { "1": "Preached at …" }. */
export function volumeFootnotes(text) {
  const lines = text.replace(/\r/g, "").split("\n");
  const start = lines.findLastIndex(l => /^\s+Footnotes\.\s*$/.test(l));
  const notes = {};
  if (start < 0) return notes;
  let cur = null;
  for (const l of lines.slice(start + 1)) {
    if (/^\s+Transcriber’s Notes\.\s*$|^\*\*\* END OF/.test(l)) break;
    const m = /^\s+(\d+) [–‒-] (.*)$/.exec(l);
    if (m) { cur = m[1]; notes[cur] = m[2].trim(); }
    else if (cur && l.trim()) notes[cur] += " " + l.trim();
    else cur = null;
  }
  return notes;
}

const plain = s => s.replace(/[_|♦♠♥♣]/g, "").replace(/\s+/g, " ").trim();
const indent = l => /^ */.exec(l)[0].length;
const isRefLine = l => /^(?:[1-3] )?[A-Z][A-Za-z]+\.? [ivxlc]+\. [\d,‒–\- ]+\.?$/.test(l.trim());

/**
 * Parses one sermon. `footnotes` holds the volume's end-of-book notes (volumes 1–3);
 * volume 4 prints its notes inline, marked with superscript figures.
 * Returns { number, heading, discourse ("II" or null), refLine, quote, occasion, blocks }.
 */
export function parseSermon(number, lines, footnotes) {
  const head = HEADING.exec(lines[0]);
  let i = 1;
  const skipBlank = () => { while (i < lines.length && !lines[i].trim()) i++; };
  let occasion = null;
  if (head[2] && head[2].startsWith("[")) occasion = footnotes[head[2].slice(1, -1)] ?? null;
  skipBlank();
  if (head[2] === "¹") { // note printed under the heading
    const note = [];
    while (lines[i].trim()) note.push(lines[i++].trim());
    occasion = note.join(" ").replace(/^¹\s*/, "");
    skipBlank();
  }
  let heading = null, discourse = null, refLine = null;
  while (i < lines.length && !refLine) {
    const l = lines[i].trim();
    if (!l) { i++; continue; }
    if (isRefLine(l)) refLine = l;
    else if (/^DISCOURSE [IVXL]+\.$/.test(l)) discourse = l.slice(10, -1);
    else if (indent(lines[i]) >= 8) heading = heading ? `${heading} ${l}` : l;
    else throw new Error(`Sermon ${number}: unexpected heading line "${l}"`);
    i++;
  }
  if (!refLine) throw new Error(`Sermon ${number}: no text reference`);
  skipBlank();
  // The text: indented lines up to the first paragraph that starts at the margin.
  const quote = [];
  while (i < lines.length && (!lines[i].trim() || indent(lines[i]) >= 2)) { if (lines[i].trim()) quote.push(lines[i].trim()); i++; }

  // Body blocks. Footnote anchors are renumbered per sermon and listed at the end.
  const notes = [];
  const pending = []; // volume-4 superscript anchors awaiting their note: { sup, k }
  const anchor = t => t
    .replace(/\[(\d+)\]/g, (_, n) => { notes.push(footnotes[n] === undefined ? null : plain(footnotes[n])); return `[${notes.length}]`; })
    .replace(/[¹²³⁴⁵⁶⁷⁸⁹]/g, s => { notes.push(null); pending.push({ sup: s, k: notes.length - 1 }); return `[${notes.length}]`; });
  const blocks = [];
  let group = [];
  const flush = () => {
    if (!group.length) return;
    const g = group; group = [];
    // Decorations, and the transcribers' correction notes printed inline in volume 4.
    if (g.some(l => /^Illustration:/.test(l.trim())) || /^\s+[♦♠♥♣]/.test(g[0])) return;
    const sup = /^\s+([¹²³⁴⁵⁶⁷⁸⁹])\s+(.*)$/.exec(g[0]);
    if (sup && indent(g[0]) <= 4) { // volume-4 note
      const p = pending.findLast(x => x.sup === sup[1] && notes[x.k] === null);
      if (!p) throw new Error(`Sermon ${number}: note ${sup[1]} without an anchor`);
      notes[p.k] = plain([sup[2], ...g.slice(1)].join(" "));
      return;
    }
    const text = plain(anchor(g.join(" ")));
    const letters = text.replace(/[^A-Za-z]/g, "");
    // A centred heading in capitals ("THE PROMISE of SANCTIFICATION.").
    if (g.every(l => indent(l) >= 10) && text.length < 80 && letters.length && letters.replace(/[^A-Z]/g, "").length / letters.length >= 0.6 && !g.some(l => l.includes("_"))) blocks.push({ h: text });
    else if (g.every(l => indent(l) >= 3)) blocks.push({ q: g.map(l => plain(anchor(l))) });
    else blocks.push({ p: text });
  };
  for (; i < lines.length; i++) {
    if (!lines[i].trim()) flush();
    else group.push(lines[i]);
  }
  flush();
  if (notes.some(n => n === null)) throw new Error(`Sermon ${number}: ${notes.filter(n => n === null).length} footnote(s) without text`);
  if (notes.length) blocks.push({ h: "Notes" }, ...notes.map((n, k) => ({ p: `[${k + 1}] ${n}` })));
  return { number, heading, discourse, refLine, quote: plain(quote.join(" ")), occasion: occasion && plain(occasion), blocks };
}

const BOOK_NAMES = { ephes: "Ephesians", eph: "Ephesians", numb: "Numbers", rom: "Romans", matt: "Matthew", phil: "Philippians", gen: "Genesis", "2 cor": "2 Corinthians", "1 peter": "1 Peter", jer: "Jeremiah" };
/** "ROM. x. 5, 6, 7, 8." -> "Romans 10:5,6,7,8"; "MATT. vi. 1‒15." -> "Matthew 6:1-15". */
export function modernRef(refLine) {
  const m = /^((?:[1-3] )?[A-Za-z]+)\.? ([ivxlc]+)\. ([\d,‒–\- ]+?)\.?$/.exec(refLine.trim());
  if (!m) return null;
  const key = m[1].toLowerCase();
  const name = BOOK_NAMES[key] ?? m[1].replace(/[A-Z]+/g, w => w[0] + w.slice(1).toLowerCase());
  return `${name} ${roman(m[2].toUpperCase())}:${m[3].replace(/[‒–]/g, "-").replace(/\s+/g, "")}`;
}

const SMALL = new Set("a an and as at but by for from in into of on or the to with".split(" "));
/** "THE GREAT PRIVILEGE OF THOSE THAT ARE BORN OF GOD." -> "The Great Privilege of Those That Are Born of God". */
export function titleCase(s) {
  return s.replace(/[.:;,]+$/, "").toLowerCase().split(" ").map((w, i) =>
    i > 0 && SMALL.has(w) ? w : w.replace(/(^|-)([a-z])/g, (_, a, b) => a + b.toUpperCase())).join(" ");
}

