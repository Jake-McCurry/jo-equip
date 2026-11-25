// Scripture-reference parsing for the commentary / cross-reference generator.
// Handles OSIS ids ("John.3.16-John.3.18"), and the abbreviated reference
// lists used by TSK ("Joh 3:2; 7:50,51; 10") and Barnes ("Jn 7:50,51, 19:39").
import { CHAPTER_VERSES } from "../../worker/bible-catalog.js";

export const BOOKS = Object.keys(CHAPTER_VERSES);
const OSIS = "Gen Exod Lev Num Deut Josh Judg Ruth 1Sam 2Sam 1Kgs 2Kgs 1Chr 2Chr Ezra Neh Esth Job Ps Prov Eccl Song Isa Jer Lam Ezek Dan Hos Joel Amos Obad Jonah Mic Nah Hab Zeph Hag Zech Mal Matt Mark Luke John Acts Rom 1Cor 2Cor Gal Eph Phil Col 1Thess 2Thess 1Tim 2Tim Titus Phlm Heb Jas 1Pet 2Pet 1John 2John 3John Jude Rev".split(" ");
const osisIndex = new Map(OSIS.map((id, i) => [id, i + 1]));

// Abbreviations seen in TSK and Barnes (lower-case, spaces and dots removed).
// Explicit entries resolve ambiguity (TSK "Jud" = Judges; "Jo" alone = John)
// and a handful of doubled-letter typos in Barnes ("Romm", "1Timm").
const ALIASES = {
  ge: 1, gen: 1, genn: 1, ex: 2, exo: 2, exod: 2, le: 3, lev: 3, levv: 3, nu: 4, num: 4, de: 5, deu: 5, deut: 5,
  jos: 6, josh: 6, jud: 7, judg: 7, jdg: 7, ru: 8, ruth: 8, "1sa": 9, "1sam": 9, "2sa": 10, "2sam": 10,
  "1ki": 11, "1kgs": 11, "1kin": 11, "2ki": 12, "2kgs": 12, "2kin": 12, "1ch": 13, "1chr": 13, "2ch": 14, "2chr": 14,
  ezr: 15, ezra: 15, ne: 16, neh: 16, nehh: 16, es: 17, est: 17, esth: 17, job: 18, ps: 19, psa: 19, psalm: 19, psalms: 19,
  pr: 20, pro: 20, prov: 20, provo: 20, ec: 21, ecc: 21, eccl: 21, eccles: 21, so: 22, song: 22, sol: 22, can: 22,
  is: 23, isa: 23, je: 24, jer: 24, la: 25, lam: 25, eze: 26, ezek: 26, da: 27, dan: 27, ho: 28, hos: 28, hoss: 28,
  joe: 29, joel: 29, joell: 29, am: 30, amos: 30, ob: 31, obad: 31, jon: 32, jonah: 32, mi: 33, mic: 33, na: 34, nah: 34, nahh: 34,
  hab: 35, zep: 36, zeph: 36, hag: 37, zec: 38, zech: 38, mal: 39,
  mt: 40, mat: 40, matt: 40, mr: 41, mk: 41, mar: 41, mark: 41, lu: 42, lk: 42, luk: 42, luke: 42, lkke: 42,
  joh: 43, jn: 43, jnn: 43, john: 43, ac: 44, acts: 44, actst: 44, actsts: 44, ro: 45, rom: 45, romm: 45,
  "1co": 46, "1cor": 46, "2co": 47, "2cor": 47, ga: 48, gal: 48, gall: 48, eph: 49, ep: 49, php: 50, phi: 50, phil: 50, ph: 50,
  col: 51, "1th": 52, "1thes": 52, "1thess": 52, "2th": 53, "2thes": 53, "2thess": 53,
  "1ti": 54, "1tim": 54, "1timm": 54, "2ti": 55, "2tim": 55, tit: 56, titus: 56, phm: 57, phlm: 57, philem: 57,
  heb: 58, he: 58, jas: 59, jam: 59, "1pe": 60, "1pet": 60, "2pe": 61, "2pet": 61,
  "1jo": 62, "1jn": 62, "1john": 62, "2jo": 63, "2jn": 63, "2john": 63, "3jo": 64, "3jn": 64, "3john": 64,
  jude: 65, re: 66, rev: 66, revv: 66,
};

export const bookIndexOfAbbr = abbr => ALIASES[abbr.toLowerCase().replace(/[\s.]/g, "")] ?? null;
export const code = (b, c, v) => b * 1_000_000 + c * 1_000 + v;
export const decode = n => ({ b: Math.floor(n / 1_000_000), c: Math.floor(n / 1_000) % 1_000, v: n % 1_000 });

/** True when the coordinate exists in KJV versification (v = 0 means the whole chapter). */
export function validCode(n) {
  const { b, c, v } = decode(n);
  const chapters = CHAPTER_VERSES[BOOKS[b - 1]];
  return !!chapters && c >= 1 && c <= chapters.length && v >= 0 && v <= chapters[c - 1];
}
export const validRange = (from, to) => validCode(from) && (to === undefined || (validCode(to) && to > from && Math.floor(to / 1e6) === Math.floor(from / 1e6)));
/** Ranges that cross into another book link to their first verse only. */
export const sameBookEnd = (from, to) => (to !== undefined && Math.floor(to / 1e6) !== Math.floor(from / 1e6) ? undefined : to);

/** "John.3.16" or "John.3.16-John.3.18" (first of a space-separated list). */
export function parseOsis(ref) {
  const [a, z] = ref.trim().split(/\s+/)[0].split("-");
  const one = s => {
    const m = /^([1-3]?[A-Za-z]+)\.(\d+)(?:\.(\d+))?/.exec(s ?? "");
    const b = m && osisIndex.get(m[1]);
    return b ? code(b, Number(m[2]), Number(m[3] ?? 0)) : null;
  };
  const from = one(a);
  if (from === null) return null;
  let to = z ? one(z) : undefined;
  if (z && to === null) { // "John.3.16-18" style
    const n = /^\d+$/.test(z) ? Number(z) : null;
    to = n === null ? null : from - (from % 1000) + n;
  }
  return to === null ? null : { from, to: to === from ? undefined : to };
}

/**
 * Splits an abbreviated reference list into linkable pieces.
 * Returns [{ start, end, from, to? }] with character offsets into `text`.
 * `ctx` = { b, c }: the book/chapter a bare number refers to (TSK "10; 7:47").
 */
export function parseRefList(text, ctx) {
  const out = [];
  let b = ctx.b, c = ctx.c, afterBook = false;
  const re = /((?:[1-3] ?)?[A-Z][a-z]+)\.? ?(?=\d)|(\d+)(?::(\d+))?(?:\s*[-–]\s*(\d+)(?::(\d+))?)?|[;,]|\S/g;
  let pendingStart = -1;
  for (let m; (m = re.exec(text));) {
    if (m[1]) {
      const idx = bookIndexOfAbbr(m[1]);
      if (!idx) { afterBook = false; pendingStart = -1; continue; }
      b = idx; afterBook = true; pendingStart = m.index; continue;
    }
    if (m[2]) {
      const single = CHAPTER_VERSES[BOOKS[b - 1]].length === 1;
      const n1 = Number(m[2]), n2 = m[3] && Number(m[3]), n3 = m[4] && Number(m[4]), n4 = m[5] && Number(m[5]);
      let from, to;
      if (n2) { // c:v[-v | -c:v]
        c = n1;
        from = code(b, c, n2);
        if (n4) to = code(b, n3, n4); else if (n3) to = code(b, c, n3);
      } else if (afterBook && !single) { // chapter (or chapter range) only
        c = n1; from = code(b, c, 0);
      } else { // verse (or verse range) in the current chapter
        if (single) c = 1;
        from = code(b, c, n1);
        if (n4) to = code(b, n3, n4); else if (n3) to = code(b, c, n3);
      }
      out.push({ start: pendingStart >= 0 ? pendingStart : m.index, end: m.index + m[0].length, from, ...(to && to !== from ? { to } : {}) });
      afterBook = false; pendingStart = -1;
      continue;
    }
    if (m[0] !== ";" && m[0] !== ",") { afterBook = false; pendingStart = -1; }
  }
  return out;
}
