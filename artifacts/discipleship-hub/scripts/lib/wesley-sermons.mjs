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


// ---------- Later sermons: 1788 Sermons on Several Occasions, volumes 5–8 ----------
// Transcription: the Christian Classics Ethereal Library plain text, which gives the
// text of Thomas Jackson's edition (1872), sermons numbered 54–108 as in Jackson.
// splitLaterSermons() and laterSermonWords() must match split_later() and
// later_tokens() in scripts/verify-wesley-sermons.py.

const LATER_HEADING = /^Sermon (\d+)\b/;
const LATER_END = /^ {5}_{10,}/;
/** Jackson's bracketed editor's notes ("[Thus translated by Pitt: … -- Edit.]"); they are not Wesley's. */
const EDITOR_NOTE = /\[[^[\]]*?(?:edit\.?|\(editors\s+note\))\s*\]/gi;

/** Map of sermon number -> { lines (heading first, up to the rule before the notes), notes: { "60": "…" } }. */
export function splitLaterSermons(text) {
  const lines = text.replace(/\r/g, "").split("\n");
  const heads = [];
  lines.forEach((l, i) => { const m = LATER_HEADING.exec(l); if (m) heads.push([i, Number(m[1])]); });
  const out = new Map();
  heads.forEach(([i, n], k) => {
    const stop = k + 1 < heads.length ? heads[k + 1][0] : lines.length;
    let j = i + 1;
    while (j < stop && !LATER_END.test(lines[j])) j++;
    const notes = {};
    let cur = null;
    for (const l of lines.slice(j, stop)) {
      const m = /^\s+\[(\d+)\]\s*(.*)$/.exec(l);
      if (m) { cur = m[1]; notes[cur] = m[2].trim(); }
      else if (cur && l.trim() && !/^\s*_{10,}/.test(l)) notes[cur] += " " + l.trim();
    }
    out.set(n, { lines: lines.slice(i, j), notes });
  });
  return out;
}

const laterClean = lines => lines.slice(1).join("\n").replace(EDITOR_NOTE, " ").replace(/\[\d+\]/g, " ").replace(/(\w)-(?=\w)/g, "$1");
export const laterSermonWords = lines => (laterClean(lines).match(/[A-Za-z]+/g) ?? []).length;

/** The transcription's "--" for a dash. */
const dashes = t => t.replace(/\s*--\s*/g, " — ").replace(/^ — /, "— ").trim();
const JACKSON_NOTE = /^[[(]?text (?:of|from) (?:the )?1872 ed(?:ition|\.)?[\])]?$/i;
const NUMBERED = /^(?:\d+|[IVXL]+)\.\s/;

/**
 * Parses one later sermon. Returns { number, title, refLine, quote, subtitle, prefatory, blocks }.
 * `prefatory` is Wesley's own note printed with the sermon (the 1775 advertisement to
 * "On the Trinity", the 1788 note to "The Duty of Constant Communion"); Jackson's
 * "text of the 1872 edition" notes are dropped.
 */
export function parseLaterSermon(number, { lines, notes }) {
  const body = lines.slice(1).join("\n").replace(EDITOR_NOTE, "").split("\n");
  let i = 0;
  const skipBlank = () => { while (i < body.length && !body[i].trim()) i++; };
  skipBlank();
  const prefatory = [];
  const takeNote = t => t.replace(/\s*\[(\d+)\]\s*/g, (_, n) => {
    const note = notes[n];
    if (note === undefined) throw new Error(`Later sermon ${number}: note [${n}] has no text`);
    if (!JACKSON_NOTE.test(note)) prefatory.push(plain(note));
    return " ";
  }).trim();
  const title = takeNote(body[i++]).replace(/\s+J\.\s?W\.$/, "").replace(/^"(.*)"$/, "$1").trim();
  skipBlank();
  // Margin lines before the text: a subtitle, or Wesley's "Advertisement" (its text is a note).
  let subtitle = null;
  while (i < body.length && indent(body[i]) === 0 && body[i].trim()) {
    const l = takeNote(body[i++]);
    if (l !== "Advertisement") subtitle = subtitle ? `${subtitle} ${l}` : l;
    skipBlank();
  }
  // The text (indented 3) and its reference (indented 2). "The New Creation" prints its text without quotes.
  const quote = [];
  while (i < body.length && indent(body[i]) !== 2) { if (body[i].trim()) quote.push(body[i].trim()); i++; }
  if (i >= body.length) throw new Error(`Later sermon ${number}: no text reference`);
  const refLine = body[i++].trim();

  const groups = [];
  let group = [], blanks = 0;
  for (; i <= body.length; i++) {
    const l = body[i];
    if (l === undefined || !l.trim()) {
      if (group.length) { groups.push({ lines: group, gap: blanks }); group = []; blanks = 0; }
      blanks++;
      continue;
    }
    group.push(l.trim());
  }
  // Verse: runs of short one-line groups (two or more, or one set off by a double blank line).
  const verse = g => g.lines.length === 1 && g.lines[0].length < 62 && !NUMBERED.test(g.lines[0]);
  const blocks = [];
  for (let k = 0; k < groups.length;) {
    if (verse(groups[k])) {
      let e = k;
      while (e + 1 < groups.length && verse(groups[e + 1]) && groups[e + 1].gap <= 1) e++;
      if (e > k || groups[k].gap >= 2) { blocks.push({ q: groups.slice(k, e + 1).map(g => plain(g.lines[0])) }); k = e + 1; continue; }
    }
    const text = plain(groups[k].lines.join(" "));
    const prev = blocks[blocks.length - 1];
    // The transcription sometimes breaks a sentence with a blank line ("… among these that" / "contained in …").
    if (prev?.p && /[a-z,]$/.test(prev.p) && /^[a-z]/.test(text)) prev.p += ` ${text}`;
    else blocks.push({ p: text });
    k++;
  }
  for (const b of blocks) {
    if (b.p) b.p = dashes(b.p);
    if (b.q) b.q = b.q.map(dashes);
  }
  return { number, title, refLine, quote: dashes(plain(quote.join(" ")).replace(/^"(.*)"$/, "$1")), subtitle, prefatory, blocks };
}
