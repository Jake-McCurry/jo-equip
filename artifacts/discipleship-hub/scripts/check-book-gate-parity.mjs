#!/usr/bin/env node
/**
 * Build-time guardrail: every book in src/data/books.ts MUST be present in
 * the Worker's VALID_BOOK_IDS allowlist (worker/index.js), and vice versa.
 *
 * Why: the Books page email gate posts { book_id } to /api/subscribe. The
 * Worker rejects unknown book_ids with 400, and because the client flow is
 * fire-and-forget (the download still opens), a missing allowlist entry
 * silently drops the signup instead of reaching Virtuous CRM. This script
 * makes that drift a hard build failure.
 *
 * Also verifies each book's PDF exists in public/books/ and that no served
 * book URL contains "final" (clean-URL rule).
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const booksSrc = readFileSync(join(root, "src/data/books.ts"), "utf8");
const bookIds = [...booksSrc.matchAll(/id: "([^"]+)"/g)].map((m) => m[1]);

const workerSrc = readFileSync(join(root, "worker/index.js"), "utf8");
const setMatch = workerSrc.match(/VALID_BOOK_IDS = new Set\(\[([\s\S]*?)\]\)/);
if (!setMatch) {
  console.error("check-book-gate-parity: VALID_BOOK_IDS not found in worker/index.js");
  process.exit(1);
}
const workerIds = [...setMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);

const errors = [];

for (const id of bookIds) {
  if (!workerIds.includes(id)) {
    errors.push(
      `Book "${id}" is in src/data/books.ts but missing from VALID_BOOK_IDS in worker/index.js — its email signups would be rejected with 400.`,
    );
  }
}
for (const id of workerIds) {
  if (!bookIds.includes(id)) {
    errors.push(
      `"${id}" is in VALID_BOOK_IDS (worker/index.js) but not in src/data/books.ts — remove it or add the book.`,
    );
  }
}

const pdfPaths = [...booksSrc.matchAll(/pdf: "([^"]+)"/g)].map((m) => m[1]);
for (const p of pdfPaths) {
  if (/final/i.test(p)) {
    errors.push(`Book PDF URL "${p}" contains "final" — book URLs must be clean.`);
  }
  if (!existsSync(join(root, "public", p))) {
    errors.push(`Book PDF "${p}" not found in public/ — copy it before building.`);
  }
}

if (errors.length > 0) {
  console.error("check-book-gate-parity FAILED:\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log(`check-book-gate-parity OK (${bookIds.length} books, allowlist in sync)`);
