// Parses George Whitefield's sermons from the Project Gutenberg transcriptions of
// The Works of the Reverend George Whitefield, M.A. (London: Dilly, 1771–1772),
// volumes 5 and 6. Used by scripts/generate-sermons.mjs.
//
// Splitting and word counts are those of the Wesley 1771 volumes (the same
// Distributed Proofreaders conventions), shared with scripts/verify-wesley-sermons.py,
// which scripts/verify-whitefield-sermons.py imports unchanged.
export { splitSermons, sermonWords } from "./wesley-sermons.mjs";

const indent = l => /^ */.exec(l)[0].length;
const plain = s => s.replace(/[_|♦♠♥♣‏]/g, "").replace(/\s+/g, " ").trim();
const REF = /^((?:[1-3] )?[A-Z]+),? ([ivxlc]+)\. (.+?)\.?(¹)?$/;
const ROMAN = /^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;
const OCCASION = /^(Preached|A Farewel|Being)\b/;

/**
 * The 1771–1772 printing sets "GOD", "CHRIST", "LORD" and the first word of each
 * sermon in small capitals, which the transcription gives as capitals. They are
 * shown in ordinary capitals and lower case; Roman numerals are kept.
 */
export const smallCaps = s => s.replace(/\b[A-Z]{2,}\b/g, w => (ROMAN.test(w) ? w : w[0] + w.slice(1).toLowerCase()));

const BOOK = { psalm: "Psalms" };
function romanNum(s) {
  const v = { i: 1, v: 5, x: 10, l: 50, c: 100 };
  let n = 0;
  for (let i = 0; i < s.length; i++) n += v[s[i]] < (v[s[i + 1]] ?? 0) ? -v[s[i]] : v[s[i]];
  return n;
}
/** "PSALM, cvii. 30, 31." -> "Psalms 107:30,31"; "MATTHEW viii. 23, to the End." -> "Matthew 8:23-END". */
export function modernRef(line) {
  const m = REF.exec(line.trim());
  if (!m) return null;
  const name = m[1].toLowerCase();
  const book = BOOK[name] ?? name.replace(/(^|\s)([a-z])/g, (_, a, b) => a + b.toUpperCase());
  const verses = m[3].replace(/^I$/, "1").replace(/, to the End$/i, "-END").replace(/[‒–]/g, "-").replace(/\s+/g, "");
  return `${book} ${romanNum(m[2])}:${verses}`;
}

/** Paragraphs, indented quotations, headings and footnotes (superscript anchors with the note printed below). */
function bodyBlocks(number, lines) {
  const notes = [];
  const pending = [];
  const anchor = t => t.replace(/[¹²³⁴⁵⁶⁷⁸⁹]/g, s => { notes.push(null); pending.push({ sup: s, k: notes.length - 1 }); return `[${notes.length}]`; });
  const blocks = [];
  let group = [];
  const flush = () => {
    if (!group.length) return;
    const g = group; group = [];
    if (/^\s*[♦♠♥♣]/.test(g[0]) || g.some(l => /^Illustration:/.test(l.trim()))) return; // transcribers' notes
    if (/^\s*END of the [A-Z]+ VOLUME\.?\s*$/.test(g.join(" "))) return;
    const sup = /^\s+([¹²³⁴⁵⁶⁷⁸⁹])\s+(.*)$/.exec(g[0]);
    if (sup && indent(g[0]) <= 4) {
      const p = pending.findLast(x => x.sup === sup[1] && notes[x.k] === null);
      if (!p) throw new Error(`Whitefield ${number}: note ${sup[1]} without an anchor`);
      notes[p.k] = smallCaps(plain([sup[2], ...g.slice(1)].join(" ")));
      return;
    }
    const text = plain(anchor(g.join(" ")));
    const letters = text.replace(/[^A-Za-z]/g, "");
    // A centred heading in capitals; a signature set at the right margin stays a paragraph.
    if (g.every(l => indent(l) >= 10 && indent(l) < 40) && text.length < 80 && letters.length && letters.replace(/[^A-Z]/g, "").length / letters.length >= 0.6 && !g.some(l => l.includes("_"))) blocks.push({ h: smallCaps(text) });
    else if (g.length === 1 && indent(g[0]) >= 30) blocks.push({ p: smallCaps(text) }); // a letter's signature
    else if (g.every(l => indent(l) >= 2)) blocks.push({ q: g.map(l => smallCaps(plain(anchor(l)))) });
    else blocks.push({ p: smallCaps(text) });
  };
  for (const l of lines) { if (!l.trim()) flush(); else group.push(l); }
  flush();
  if (notes.some(n => n === null)) throw new Error(`Whitefield ${number}: ${notes.filter(n => n === null).length} footnote(s) without text`);
  if (notes.length) blocks.push({ h: "Notes" }, ...notes.map((n, k) => ({ p: `[${k + 1}] ${n}` })));
  return blocks;
}

/**
 * One sermon (lines from splitSermons, heading first).
 * Returns { title, occasion, refLine (printed), quote, textNote, blocks }.
 * A letter printed between the title and the text (Sermons X and XXVI) opens the
 * body, followed by the printed text reference as a heading and the text itself.
 */
export function parseWhitefield(number, lines) {
  const groups = [];
  let i = 1, cur = [];
  for (; i < lines.length; i++) {
    const l = lines[i];
    if (!l.trim()) { if (cur.length) groups.push({ lines: cur, at: i - cur.length }); cur = []; continue; }
    if (indent(l) >= 8 && REF.test(l.trim()) && !cur.length) break;
    cur.push(l);
  }
  if (i >= lines.length) throw new Error(`Whitefield ${number}: no text reference`);
  const refLine = lines[i].trim();
  let title = null, occasion = [], prefaceFrom = null;
  for (const [k, g] of groups.entries()) {
    const text = plain(g.lines.join(" "));
    if (prefaceFrom !== null) continue;
    if (k === 0 && !OCCASION.test(text)) {
      const m = /^(.*?\.)\s+(Preached .*)$/.exec(text);
      title = m ? m[1] : text;
      if (m) occasion.push(m[2]);
    } else if (OCCASION.test(text)) occasion.push(text);
    else prefaceFrom = g.at;
  }
  const preface = prefaceFrom === null ? [] : bodyBlocks(number, lines.slice(prefaceFrom, i));
  i++;
  // The text: indented groups up to the first paragraph at the margin; a note on the reference follows it.
  const quote = [];
  let textNote = null;
  for (; i < lines.length; i++) {
    const l = lines[i];
    if (!l.trim()) continue;
    if (indent(l) < 2) break;
    if (/^\s+¹\s/.test(l)) {
      const note = [];
      while (i < lines.length && lines[i].trim()) note.push(lines[i++].trim());
      textNote = smallCaps(plain(note.join(" ").replace(/^¹\s*/, "")));
      continue;
    }
    quote.push(l.trim());
  }
  if (refLine.endsWith("¹") !== Boolean(textNote)) throw new Error(`Whitefield ${number}: note on the text reference`);
  const quoteText = smallCaps(plain(quote.join(" ")));
  const body = bodyBlocks(number, lines.slice(i));
  const blocks = preface.length ? [...preface, { h: modernRef(refLine).replace(/(\d),(?=\d)/g, "$1, ") }, { q: [quoteText] }, ...body] : body;
  return {
    title: title && smallCaps(title).replace(/\.$/, ""),
    occasion: occasion.length ? smallCaps(occasion.join(" ")).replace(/\.$/, "") : null,
    refLine, quote: quoteText, textNote, blocks,
  };
}
