// Explicit maintenance command (not part of the build). Spot-checks the Easton
// transcription against the OCR text of a scanned printing and writes the
// result to scripts/data/easton-scan-check.json (checked by the data test).
// Usage: node scripts/verify-easton-scan.mjs <sources directory>
//   (the directory holds illustratedbible00east_djvu.txt from the Internet Archive)
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const src = process.argv[2];
if (!src) throw new Error("Usage: node scripts/verify-easton-scan.mjs <sources directory>");
const SCAN = {
  id: "illustratedbible00east",
  title: "Illustrated Bible Dictionary (Harper & Brothers, New York, 1893; first edition)",
  library: "Library of Congress",
  file: "illustratedbible00east_djvu.txt",
  url: "https://archive.org/download/illustratedbible00east/illustratedbible00east_djvu.txt",
  md5: "f6ba3e308d3295acbad4c22505860f92",
};
const SAMPLE = 60, WORDS = 40, PASS = 0.85;
const ocrBuf = fs.readFileSync(path.join(src, SCAN.file));
const md5 = createHash("md5").update(ocrBuf).digest("hex");
if (md5 !== SCAN.md5) throw new Error(`${SCAN.file} changed (md5 ${md5})`);
const fold = s => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/æ/g, "ae");
const words = s => fold(s).match(/[a-z]+|\d+/g) ?? [];
// Join words hyphenated across lines ("ark's be-\ning") before splitting.
const ocr = words(ocrBuf.toString("utf8").replace(/(\w)-\s*\n\s*(\w)/g, "$1$2"));
const at = new Map();
ocr.forEach((w, i) => { if (i + 2 < ocr.length) { const k = `${w} ${ocr[i + 1]} ${ocr[i + 2]}`; (at.get(k) ?? at.set(k, []).get(k)).push(i); } });

function inOrderShare(a, b) {
  let prev = new Uint16Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    const cur = new Uint16Array(b.length + 1);
    for (let j = 1; j <= b.length; j++) cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    prev = cur;
  }
  return prev[b.length] / a.length;
}

const entries = JSON.parse(fs.readFileSync(new URL("../src/data/bible-dictionary/entries.json", import.meta.url), "utf8"));
const step = Math.floor(entries.length / SAMPLE);
const results = [];
for (let n = 0; n < SAMPLE; n++) {
  const e = entries[n * step];
  const text = e.paras.filter(p => p[0] === "p").map(p => p.slice(1).map(s => (typeof s === "string" ? s : s[0])).join("")).join(" ");
  const w = words(`${e.title} ${text}`).slice(0, WORDS); // the printed article opens with its headword
  let best = 0, where = -1;
  const tried = new Set();
  for (let i = 0; i + 2 < w.length && best < 1; i++) {
    for (const pos of at.get(`${w[i]} ${w[i + 1]} ${w[i + 2]}`) ?? []) {
      const start = Math.max(0, pos - i - 5);
      if (tried.has(Math.floor(start / 10))) continue;
      tried.add(Math.floor(start / 10));
      const share = inOrderShare(w, ocr.slice(start, start + w.length + 25));
      if (share > best) { best = share; where = start; }
    }
    if (i > 12) break;
  }
  results.push({ slug: e.slug, words: w.length, agreement: Number(best.toFixed(3)), ...(where >= 0 ? {} : { found: false }) });
}
const passed = results.filter(r => r.agreement >= PASS);
const out = {
  scan: SCAN,
  method: `Every ${step}th entry (${SAMPLE} entries): the first ${WORDS} words of the transcription, matched in order against the OCR text (case, accents and line-end hyphens ignored). An entry passes at ${PASS * 100}% agreement.`,
  passRate: Number((passed.length / results.length).toFixed(3)),
  results,
};
fs.writeFileSync(new URL("data/easton-scan-check.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
console.log(`passed ${passed.length}/${results.length}`);
for (const r of results.filter(r => r.agreement < PASS)) console.log(r.slug, r.agreement);
