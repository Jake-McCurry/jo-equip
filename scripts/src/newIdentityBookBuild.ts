#!/usr/bin/env node
/**
 * One-shot builder for the "Your New Identity in Christ" ebook PDF.
 *
 * Source: attached_assets/New_Identify_lightsans_cambria_1783973721791.pdf
 * Cover:  attached_assets/final_cover_contemporary2_1783973721790.jpg
 *
 * Steps:
 *  1. Fix the Contents pages (source pages 2-5): all chapter/back-matter
 *     entries have dot leaders but no page numbers (and chapter 1 shows a
 *     wrong "1" — the chapter actually starts on printed page 6). Numbers
 *     were measured against the printed footer page numbers of the source.
 *  2. Prepend the cover art as page 1 (full-bleed letter page).
 *  3. Compress with Ghostscript /ebook and write to
 *     artifacts/discipleship-hub/public/books/your-new-identity-in-christ.pdf
 *
 * Run: pnpm --filter @workspace/scripts run book:new-identity
 */
import { readFileSync, writeFileSync, statSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const ROOT = resolve(process.cwd(), "..");
const SRC_PDF = resolve(
  ROOT,
  "attached_assets/New_Identify_lightsans_cambria_1783973721791.pdf",
);
const SRC_COVER = resolve(
  ROOT,
  "attached_assets/final_cover_contemporary2_1783973721790.jpg",
);
const OUT_PDF = resolve(
  ROOT,
  "artifacts/discipleship-hub/public/books/your-new-identity-in-christ.pdf",
);

const PAGE_H = 792;
const PAGE_W = 612;

/**
 * TOC entries to number. `page` is the 0-based index in the SOURCE pdf
 * (before the cover is prepended). Coordinates come from `pdftotext -bbox`:
 * `xDotsEnd` = xMax of the dot leader, `yMaxDots` = bottom of the line's
 * font box (top-origin), `boxH` = font box height (≈ font size * 1.02).
 */
interface TocFix {
  page: number;
  xDotsEnd: number;
  yMaxDots: number;
  boxH: number;
  num: string;
}

const TOC_FIXES: TocFix[] = [
  // page 2 of source (index 1)
  { page: 1, xDotsEnd: 350.204, yMaxDots: 145.837, boxH: 12.258, num: "6" },
  { page: 1, xDotsEnd: 345.204, yMaxDots: 285.987, boxH: 12.258, num: "11" },
  { page: 1, xDotsEnd: 340.904, yMaxDots: 443.587, boxH: 12.258, num: "15" },
  { page: 1, xDotsEnd: 345.954, yMaxDots: 652.987, boxH: 12.258, num: "18" },
  // page 3 (index 2)
  { page: 2, xDotsEnd: 346.654, yMaxDots: 257.587, boxH: 12.258, num: "21" },
  { page: 2, xDotsEnd: 344.104, yMaxDots: 501.537, boxH: 12.258, num: "24" },
  // page 4 (index 3)
  { page: 3, xDotsEnd: 350.054, yMaxDots: 93.137, boxH: 12.258, num: "28" },
  { page: 3, xDotsEnd: 347.654, yMaxDots: 233.287, boxH: 12.258, num: "32" },
  { page: 3, xDotsEnd: 354.104, yMaxDots: 425.187, boxH: 12.258, num: "35" },
  { page: 3, xDotsEnd: 367.754, yMaxDots: 599.837, boxH: 12.258, num: "39" },
  { page: 3, xDotsEnd: 355.1, yMaxDots: 705.03, boxH: 13.62, num: "42" },
  // page 5 (index 4)
  { page: 4, xDotsEnd: 317.45, yMaxDots: 281.33, boxH: 13.62, num: "62" },
  { page: 4, xDotsEnd: 354.7, yMaxDots: 319.037, boxH: 12.258, num: "55" },
  { page: 4, xDotsEnd: 305.05, yMaxDots: 357.03, boxH: 13.62, num: "66" },
];

/** The wrong "1" after chapter 1's dots (source page 2) — painted over. */
const WRONG_NUMBER_BOX = { page: 1, x0: 351.3, x1: 360.5, y0: 132.5, y1: 147 };

async function main(): Promise<void> {
  const doc = await PDFDocument.load(readFileSync(SRC_PDF));
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const pages = doc.getPages();

  // Paint over the incorrect existing "1".
  const wb = WRONG_NUMBER_BOX;
  pages[wb.page].drawRectangle({
    x: wb.x0,
    y: PAGE_H - wb.y1,
    width: wb.x1 - wb.x0,
    height: wb.y1 - wb.y0,
    color: rgb(1, 1, 1),
  });

  for (const fix of TOC_FIXES) {
    const size = Math.round(fix.boxH / 1.02);
    const descent = fix.boxH * 0.22;
    pages[fix.page].drawText(fix.num, {
      x: fix.xDotsEnd + 2.3,
      y: PAGE_H - (fix.yMaxDots - descent),
      size,
      font,
      color: rgb(0, 0, 0),
    });
  }

  // Prepend the cover as a full-bleed letter page (source art is 2550x3300,
  // exactly the letter aspect ratio, so no cropping or distortion occurs).
  const coverImage = await doc.embedJpg(readFileSync(SRC_COVER));
  const coverPage = doc.insertPage(0, [PAGE_W, PAGE_H]);
  coverPage.drawImage(coverImage, { x: 0, y: 0, width: PAGE_W, height: PAGE_H });

  const tmp = `${OUT_PDF}.uncompressed.tmp.pdf`;
  writeFileSync(tmp, await doc.save());

  const gs = spawnSync(
    "gs",
    [
      "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.4",
      "-dPDFSETTINGS=/ebook",
      "-dNOPAUSE",
      "-dQUIET",
      "-dBATCH",
      `-sOutputFile=${OUT_PDF}`,
      tmp,
    ],
    { stdio: ["ignore", "inherit", "inherit"] },
  );
  if (gs.status !== 0) {
    unlinkSync(tmp);
    throw new Error(`gs failed with exit code ${gs.status}`);
  }

  const before = statSync(tmp).size;
  const after = statSync(OUT_PDF).size;
  unlinkSync(tmp);
  console.log(
    `Wrote ${OUT_PDF}\n  uncompressed: ${(before / 1024).toFixed(0)} KB → compressed: ${(after / 1024).toFixed(0)} KB`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
