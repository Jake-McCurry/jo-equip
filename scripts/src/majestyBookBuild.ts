#!/usr/bin/env node
/**
 * One-shot builder for the "Beholding the Majesty of God" ebook PDF.
 *
 * Source: attached_assets/Beholding_the_Majesty_of_God_071426_1784055917121.pdf
 *         (final author-formatted interior, exported from LibreOffice Writer —
 *         already carries live link annotations for the resource URLs)
 * Cover:  attached_assets/majesty_cover_jo_logo_edit.png
 *         (edited from FINAL_COver_1784056290216.png — navy JO logo placed
 *         directly above "JesusOnline Ministries" at the bottom)
 *
 * Steps:
 *  1. Retarget the "Share Your Story" link annotation from the stale
 *     jesusonline.com/review URL to equip.jesusonline.com/reviews/share.
 *  2. Prepend the cover art as page 1 (cover is 1024x1536 = 2:3, slightly
 *     narrower than letter — scaled to page width, overflow cropped from the
 *     top so the publisher line at the bottom stays intact).
 *  3. Compress with Ghostscript /ebook and write to
 *     artifacts/discipleship-hub/public/books/beholding-the-majesty-of-god.pdf
 *
 * Run: pnpm --filter @workspace/scripts run book:majesty
 */
import { readFileSync, writeFileSync, statSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { PDFDocument, PDFName, PDFString, PDFDict, PDFArray } from "pdf-lib";

const ROOT = resolve(process.cwd(), "..");
const SRC_PDF = resolve(ROOT, "attached_assets/Beholding_the_Majesty_of_God_071426_1784055917121.pdf");
const SRC_COVER = resolve(ROOT, "attached_assets/majesty_cover_jo_logo_edit.png");
const OUT_PDF = resolve(ROOT, "artifacts/discipleship-hub/public/books/beholding-the-majesty-of-god.pdf");

const PAGE_W = 612;
const PAGE_H = 792;

async function main(): Promise<void> {
  const doc = await PDFDocument.load(readFileSync(SRC_PDF));

  /* Retarget the stale "Share Your Story" review link. */
  let retargeted = 0;
  for (const page of doc.getPages()) {
    const annots = page.node.Annots();
    if (!annots) continue;
    for (let i = 0; i < annots.size(); i++) {
      const annot = annots.lookup(i);
      if (!(annot instanceof PDFDict)) continue;
      const action = annot.lookup(PDFName.of("A"));
      if (!(action instanceof PDFDict)) continue;
      const uri = action.lookup(PDFName.of("URI"));
      if (uri instanceof PDFString && /jesusonline\.com\/review\/?$/.test(uri.decodeText())) {
        action.set(PDFName.of("URI"), PDFString.of("https://equip.jesusonline.com/reviews/share"));
        retargeted++;
      }
    }
  }
  console.log(`Retargeted ${retargeted} Share-Your-Story link annotation(s).`);
  if (retargeted === 0) throw new Error("Expected to retarget the jesusonline.com/review link but found none.");

  /* Prepend the cover. */
  const coverImage = await doc.embedPng(readFileSync(SRC_COVER));
  const scale = PAGE_W / coverImage.width;
  const drawnH = coverImage.height * scale; // 1536/1024 * 612 = 918pt — overflows
  const overflow = drawnH - PAGE_H;
  const bottomCrop = Math.min(12, Math.max(0, overflow));
  const coverPage = doc.insertPage(0, [PAGE_W, PAGE_H]);
  coverPage.drawImage(coverImage, { x: 0, y: -bottomCrop, width: PAGE_W, height: drawnH });

  const tmp = `${OUT_PDF}.uncompressed.tmp.pdf`;
  writeFileSync(tmp, await doc.save());
  const gs = spawnSync(
    "gs",
    ["-sDEVICE=pdfwrite", "-dCompatibilityLevel=1.4", "-dPDFSETTINGS=/ebook", "-dNOPAUSE", "-dQUIET", "-dBATCH", `-sOutputFile=${OUT_PDF}`, tmp],
    { stdio: ["ignore", "inherit", "inherit"] },
  );
  if (gs.status !== 0) {
    unlinkSync(tmp);
    throw new Error(`gs failed with exit code ${gs.status}`);
  }
  const before = statSync(tmp).size;
  const after = statSync(OUT_PDF).size;
  unlinkSync(tmp);
  console.log(`Wrote ${OUT_PDF}\n  uncompressed: ${(before / 1024).toFixed(0)} KB → compressed: ${(after / 1024).toFixed(0)} KB`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
