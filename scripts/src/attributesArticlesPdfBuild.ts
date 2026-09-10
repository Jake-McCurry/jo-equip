#!/usr/bin/env node
/**
 * Build the 27 local Attributes of God article PDFs.
 *
 * Article metadata and output paths come from the hub's local article overlay;
 * bodies come from the importer's lossless HTML fragments. Local images are
 * embedded as data URLs so PDF rendering is deterministic and offline.
 */
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import puppeteer from "puppeteer";
import {
  prepareAttributesLocalHtml,
  renderArticlePdf,
  resolveChromiumPath,
} from "./articlesBuild";

const ROOT = resolve(process.cwd(), "..");
const DATA_PATH = resolve(
  ROOT,
  "artifacts/discipleship-hub/src/data/local/articles/attributes-of-god.json",
);
const FRAGMENTS_DIR = resolve(process.cwd(), "data/local-articles/attributes-of-god");
const PUBLIC_DIR = resolve(ROOT, "artifacts/discipleship-hub/public");

interface AttributeArticle {
  id: string;
  title: string;
  appSlug?: string;
  pdf: string;
  localSource: boolean;
}

async function main(): Promise<void> {
  const articles = JSON.parse(readFileSync(DATA_PATH, "utf8")) as AttributeArticle[];
  if (!Array.isArray(articles) || articles.length !== 27) {
    throw new Error(`Expected exactly 27 Attributes of God articles; found ${articles.length}`);
  }
  if (new Set(articles.map(article => article.id)).size !== articles.length) {
    throw new Error("Attributes of God article IDs must be unique");
  }

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: resolveChromiumPath(),
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    for (const [index, article] of articles.entries()) {
      if (!article.localSource) throw new Error(`${article.id} is not marked as local source`);
      const expectedPdf = article.appSlug
        ? `/articles/${article.appSlug}.pdf`
        : `/articles/attributes-of-god/${article.id}.pdf`;
      if (article.pdf !== expectedPdf) {
        throw new Error(`${article.id} has unexpected PDF path: ${article.pdf}`);
      }

      const fragmentPath = resolve(FRAGMENTS_DIR, `${article.id}.html`);
      if (!existsSync(fragmentPath)) throw new Error(`Missing article fragment: ${article.id}.html`);
      const bodyHtml = prepareAttributesLocalHtml(readFileSync(fragmentPath, "utf8"));
      const outPath = resolve(PUBLIC_DIR, article.pdf.replace(/^\/+/, ""));
      mkdirSync(resolve(outPath, ".."), { recursive: true });

      await renderArticlePdf(browser, {
        title: article.title,
        bodyHtml,
        sourceUrl: `equip.jesusonline.com/categories/growth/attributes-of-god/${article.id}`,
        outPath,
        disableLigatures: true,
      });
      const kb = Math.round(statSync(outPath).size / 1024);
      console.log(`[${index + 1}/27] ${article.id} (${kb} KB)`);
    }
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error("FATAL:", error);
  process.exit(1);
});