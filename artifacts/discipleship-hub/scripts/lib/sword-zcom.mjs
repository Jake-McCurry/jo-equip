// Minimal reader for CrossWire SWORD compressed commentary modules
// (zCom / zCom4, ZIP compression, KJV versification). Maintenance-only.
import fs from "node:fs";
import path from "node:path";
import { inflateSync } from "node:zlib";
import { CHAPTER_VERSES } from "../../worker/bible-catalog.js";

const BOOKS = Object.keys(CHAPTER_VERSES);

/**
 * Yields { book, chapter, verse, text, to? } for every non-empty entry. chapter 0 =
 * book introduction; verse 0 = chapter introduction. SWORD "linked" verses share
 * one stored entry; they are yielded once, at the first verse, with `to` set to
 * the last linked verse of the same chapter.
 */
export function* readZCom(moduleDir) {
  readZCom.skipped = [];
  const conf = fs.readdirSync(path.join(moduleDir, "mods.d")).find(f => f.endsWith(".conf"));
  const text = fs.readFileSync(path.join(moduleDir, "mods.d", conf), "utf8");
  const get = key => new RegExp(`^${key}=(.*)$`, "m").exec(text)?.[1].trim();
  if (get("Versification") && get("Versification") !== "KJV") throw new Error(`${conf}: only KJV versification is supported`);
  if (get("CompressType") !== "ZIP") throw new Error(`${conf}: only ZIP compression is supported`);
  const four = get("ModDrv") === "zCom4";
  const data = path.join(moduleDir, get("DataPath").replace(/^\.\//, ""));
  for (const [testament, books] of [["ot", BOOKS.slice(0, 39)], ["nt", BOOKS.slice(39)]]) {
    // Block type picks the file prefix: b(ook), c(hapter) or v(erse).
    const kind = ["b", "c", "v"].find(k => fs.existsSync(path.join(data, `${testament}.${k}zs`)));
    if (!kind) continue; // e.g. NT-only modules
    const bzs = fs.readFileSync(path.join(data, `${testament}.${kind}zs`));
    const bzv = fs.readFileSync(path.join(data, `${testament}.${kind}zv`));
    const bzz = fs.readFileSync(path.join(data, `${testament}.${kind}zz`));
    const blocks = new Map();
    const block = n => {
      if (!blocks.has(n)) {
        const off = bzs.readUInt32LE(n * 12), size = bzs.readUInt32LE(n * 12 + 4);
        blocks.set(n, inflateSync(bzz.subarray(off, off + size)));
      }
      return blocks.get(n);
    };
    const rec = four ? 12 : 10;
    const expected = 2 + books.reduce((a, b) => a + 1 + CHAPTER_VERSES[b].reduce((x, v) => x + 1 + v, 0), 0);
    if (bzv.length / rec !== expected) throw new Error(`${conf} ${testament}: ${bzv.length / rec} index entries, expected ${expected}`);
    let idx = 2;
    // Stored text already yielded for another passage. Some modules (Barnes) leave
    // empty intro slots pointing at an earlier, unrelated entry; such
    // non-adjacent repeats are skipped so text is never attributed twice.
    const used = new Set();
    for (const book of books) {
      const coords = [[0, 0]];
      CHAPTER_VERSES[book].forEach((n, c) => { coords.push([c + 1, 0]); for (let v = 1; v <= n; v++) coords.push([c + 1, v]); });
      let pending = null, lastKey = "";
      for (const [chapter, verse] of coords) {
        const o = idx++ * rec;
        const b = bzv.readUInt32LE(o), start = bzv.readUInt32LE(o + 4);
        const size = four ? bzv.readUInt32LE(o + 8) : bzv.readUInt16LE(o + 8);
        const key = `${b}:${start}:${size}`;
        if (size && key === lastKey && pending && pending.chapter === chapter && verse > 0) { pending.to = verse; continue; }
        if (pending) yield pending;
        pending = null; lastKey = key;
        if (!size) continue;
        if (used.has(key)) { readZCom.skipped.push(`${book} ${chapter}:${verse}`); continue; }
        used.add(key);
        const body = block(b).subarray(start, start + size).toString("utf8").replace(/\0+$/, "").trim();
        if (body) pending = { book, chapter, verse, text: body };
      }
      if (pending) yield pending;
    }
  }
}
/** Passages whose index entry repeated earlier stored text (set by the last readZCom run). */
readZCom.skipped = [];
