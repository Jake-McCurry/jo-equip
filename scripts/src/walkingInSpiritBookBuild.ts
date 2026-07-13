#!/usr/bin/env node
/**
 * One-shot builder for the "Walking in the Spirit" ebook PDF.
 *
 * Source: attached_assets/FINALWalking_in_the_Spirit_1783978825795.pdf
 * Cover:  attached_assets/FINAL_cover7_1783979469133.png
 *         (converted from FINAL_cover7_1783979469133.pdf, which is actually
 *         a Photoshop file — flattened via `magick "<file>[0]" -flatten`)
 *
 * The source Contents page numbers were verified against the printed page
 * footers (spot-checked chapters 1-2, Appendix A-E) — all correct, so no
 * TOC repair is needed for this book.
 *
 * Steps:
 *  1. Prepend the cover art as page 1. The cover (1055x1491) is slightly
 *     narrower than the letter aspect ratio, so it is scaled to fill the
 *     page width and the vertical overflow is cropped mostly from the top
 *     (sky/clouds) to keep the publisher line at the bottom intact.
 *  2. Compress with Ghostscript /ebook and write to
 *     artifacts/discipleship-hub/public/books/walking-in-the-spirit.pdf
 *
 * Run: pnpm --filter @workspace/scripts run book:walking-spirit
 */
import { readFileSync, writeFileSync, statSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { PDFDocument } from "pdf-lib";

const ROOT = resolve(process.cwd(), "..");
const SRC_PDF = resolve(
  ROOT,
  "attached_assets/FINALWalking_in_the_Spirit_1783978825795.pdf",
);
const SRC_COVER = resolve(ROOT, "attached_assets/FINAL_cover7_1783979469133.png");
const OUT_PDF = resolve(
  ROOT,
  "artifacts/discipleship-hub/public/books/walking-in-the-spirit.pdf",
);

const PAGE_H = 792;
const PAGE_W = 612;

async function main(): Promise<void> {
  const doc = await PDFDocument.load(readFileSync(SRC_PDF));

  const coverImage = await doc.embedPng(readFileSync(SRC_COVER));
  const scale = PAGE_W / coverImage.width;
  const drawnH = coverImage.height * scale; // ~864.9pt — taller than the page
  const overflow = drawnH - PAGE_H;
  // Crop the overflow mostly from the top (sky) — the bottom carries the
  // "Published by JesusOnline Ministries" line that must stay visible.
  const bottomCrop = Math.min(10, overflow);
  const coverPage = doc.insertPage(0, [PAGE_W, PAGE_H]);
  coverPage.drawImage(coverImage, {
    x: 0,
    y: -bottomCrop,
    width: PAGE_W,
    height: drawnH,
  });

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
