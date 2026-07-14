#!/usr/bin/env node
/**
 * One-shot builder for the "Your New Identity in Christ" ebook PDF.
 *
 * Source: attached_assets/FINAL_New_Identity_in_Christ_ebook_1783977679574.pdf
 * Cover:  attached_assets/identity_cover_jo_logo_edit.jpg
 *         (edited from final_cover_contemporary2_1783977730284.jpg — navy JO
 *         logo added directly above "JesusOnline Ministries" at the bottom)
 *
 * Steps:
 *  1. Fix the Contents: the FINAL source has page numbers baked in and all
 *     are correct except "All Key Verses (NET Bible)" which says 61 but the
 *     section starts on printed page 62 (verified against page footers).
 *     The wrong right-aligned "61" is painted over and "62" is drawn
 *     right-aligned to the same edge.
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
  "attached_assets/FINAL_New_Identity_in_Christ_ebook_1783977679574.pdf",
);
const SRC_COVER = resolve(
  ROOT,
  "attached_assets/identity_cover_jo_logo_edit.jpg",
);
const OUT_PDF = resolve(
  ROOT,
  "artifacts/discipleship-hub/public/books/your-new-identity-in-christ.pdf",
);

const PAGE_H = 792;
const PAGE_W = 612;

/**
 * Wrong "All Key Verses" TOC number on source page 4 (0-based index 3).
 * Coordinates from `pdftotext -bbox` (top-origin): the "61" occupies
 * x 527.5-535.8, y 493.1-506.1; numbers in this TOC are right-aligned to
 * x=535.8 with a font box height of 13.0 (≈ 12.75pt).
 */
const FIX = {
  pageIndex: 3,
  rightEdge: 535.8,
  yMin: 493.1,
  yMax: 506.1,
  correct: "62",
};

async function main(): Promise<void> {
  const doc = await PDFDocument.load(readFileSync(SRC_PDF));
  // The TOC numbers are set in Noto Sans at ~9.5pt (measured: digit ink is
  // 14px tall in a 150dpi render → 6.7pt cap height). Helvetica is the
  // closest standard font; 9.4pt reproduces the same optical digit height.
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.getPages()[FIX.pageIndex];

  const boxH = FIX.yMax - FIX.yMin;
  // 9.4pt rendered 16px of digit ink at 150dpi vs 14px for the surrounding
  // Noto Sans TOC numbers; scale by 14/16 to match the neighbors' optical size.
  const size = 8.2;
  const descent = 2.6; // measured baseline offset from the font-box bottom

  page.drawRectangle({
    x: 525.5,
    y: PAGE_H - (FIX.yMax + 1),
    width: 12,
    height: boxH + 2,
    color: rgb(1, 1, 1),
  });
  page.drawText(FIX.correct, {
    x: FIX.rightEdge - font.widthOfTextAtSize(FIX.correct, size),
    y: PAGE_H - (FIX.yMax - descent),
    size,
    font,
    // Sampled from the neighboring TOC numbers: dark slate gray, not black.
    color: rgb(82 / 255, 92 / 255, 96 / 255),
  });

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
