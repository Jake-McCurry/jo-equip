#!/usr/bin/env node
/**
 * Regenerates the Books-page cover thumbnails from the book PDFs so they all
 * share a uniform height and consistent quality.
 *
 * For every PDF in artifacts/discipleship-hub/public/books/*.pdf:
 *  1. Render page 1 at high resolution (pdftoppm).
 *  2. Trim uniform white page margins (magick -fuzz 1% -trim).
 *  3. Resize to 900px tall and save as JPEG (quality 85, stripped) to
 *     artifacts/discipleship-hub/src/assets/books/covers/<id>.jpg
 *  4. Remove a stale <id>.png next to it, if present.
 *
 * Astro's <Image> component recompresses these to responsive WebP at build
 * time, so the JPEGs here only need to be clean, high-res sources.
 *
 * EXCLUDED books keep their hand-picked cover (e.g. the PDF's first page is
 * an interior title page, not cover art).
 *
 * Run: pnpm --filter @workspace/scripts run covers:build
 */
import { readdirSync, statSync, existsSync, unlinkSync, mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const ROOT = resolve(process.cwd(), "..");
const BOOKS_DIR = resolve(ROOT, "artifacts/discipleship-hub/public/books");
const COVERS_DIR = resolve(ROOT, "artifacts/discipleship-hub/src/assets/books/covers");

/** Books whose PDF page 1 is NOT usable cover art — keep their existing file. */
const EXCLUDED = new Set(["hearing-the-voice-of-god"]);

const TARGET_HEIGHT = 900;

function run(cmd: string, args: string[]): void {
  const res = spawnSync(cmd, args, { stdio: ["ignore", "inherit", "inherit"] });
  if (res.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} failed with exit code ${res.status}`);
  }
}

const tmp = mkdtempSync(join(tmpdir(), "book-covers-"));
try {
  const pdfs = readdirSync(BOOKS_DIR)
    .filter((f) => f.endsWith(".pdf"))
    .sort();

  for (const pdf of pdfs) {
    const id = pdf.replace(/\.pdf$/, "");
    if (EXCLUDED.has(id)) {
      console.log(`skip  ${id} (excluded — keeps existing cover)`);
      continue;
    }

    const raw = join(tmp, id);
    run("pdftoppm", [
      "-f", "1", "-l", "1",
      "-scale-to-y", "1400", "-scale-to-x", "-1",
      "-jpeg", "-jpegopt", "quality=95",
      "-singlefile",
      join(BOOKS_DIR, pdf),
      raw,
    ]);

    const out = join(COVERS_DIR, `${id}.jpg`);
    run("magick", [
      `${raw}.jpg`,
      "-fuzz", "1%", "-trim", "+repage",
      "-resize", `x${TARGET_HEIGHT}`,
      "-strip", "-quality", "85",
      out,
    ]);

    const stalePng = join(COVERS_DIR, `${id}.png`);
    if (existsSync(stalePng)) unlinkSync(stalePng);

    const kb = (statSync(out).size / 1024).toFixed(0);
    console.log(`wrote ${id}.jpg (${kb} KB)`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
