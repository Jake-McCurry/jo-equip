import type { Browser } from "puppeteer";
import type { ParsedBook } from "./ebookDocxBuild.js";

/**
 * The Adventure guide manuscript is a Word source with a Heading 2 Contents
 * leaf followed by Heading 1 sections.  It is deliberately split in the
 * browser, rather than by regular expressions, so tables and the illustrated
 * callouts remain intact as Mammoth emitted them.
 */
export async function parseAdventureDocx(
  browser: Browser,
  rawHtml: string,
  title: string,
  subtitleHtml: string,
): Promise<ParsedBook> {
  const page = await browser.newPage();
  try {
    await page.setRequestInterception(true);
    page.on("request", request => {
      if (/^(data:|about:)/.test(request.url())) request.continue();
      else request.abort();
    });
    await page.setContent(rawHtml, { waitUntil: "load" });
    return await page.evaluate(`(() => {
      const text = el => el.textContent.replace(/\\s+/g, " ").trim();
      const elements = [...document.body.children];
      const tocIndex = elements.findIndex(el => text(el) === "Contents");
      const firstChapter = elements.findIndex((el, i) => i > tocIndex && el.tagName === "H1");
      if (tocIndex < 0 || firstChapter < 0) {
        throw new Error("Adventure front matter/chapter headings not found");
      }
      const html = nodes => nodes.map(el => el.outerHTML).join("\\n");
      const keyFor = label => {
        if (label === "Begin the Adventure") return "INTRO";
        const numbered = label.match(/^([1-8])\\./);
        if (numbered) return numbered[1];
        if (label === "Continuing with Jesus") return "CONT";
        if (label === "Additional Resources") return "MORE";
        return null;
      };

      const chapters = [];
      let current = null;
      for (let i = firstChapter; i < elements.length; i++) {
        const el = elements[i];
        const label = text(el);
        if (el.tagName === "H1") {
          const key = keyFor(label);
          if (!key) throw new Error("Unexpected Adventure section: " + label);
          current = { key, headingHtml: el.innerHTML, nodes: [] };
          chapters.push(current);
          continue;
        }
        if (!current) throw new Error("Adventure body found outside a chapter");
        if (label || el.querySelector("img")) current.nodes.push(el);
      }

      const tocLabels = [];
      for (const el of elements.slice(tocIndex + 1, firstChapter)) {
        const label = text(el);
        if (!label) continue;
        const key = keyFor(label);
        if (key) tocLabels.push({ kind: "entry", labelText: label, key });
      }
      const expected = chapters.map(chapter => ({
        kind: "entry",
        labelText: text({ textContent: chapter.headingHtml.replace(/<[^>]+>/g, " ") }),
        key: chapter.key,
      }));
      /* The source TOC is authoritative for its labels; use chapter labels
         only if Word omitted one of the TOC paragraphs. */
      const tocEntries = tocLabels.length === chapters.length ? tocLabels : expected;

      return {
        frontPagesHtml: '<section class="front-matter">' +
          '<h1>' + ${JSON.stringify(title)} + '</h1>' +
          '<p class="subtitle">' + ${JSON.stringify(subtitleHtml)} + '</p>' +
          html(elements.slice(2, tocIndex)) +
          '</section>',
        tocEntries,
        chapters: chapters.map(chapter => ({
          key: chapter.key,
          headingHtml: chapter.headingHtml,
          bodyHtml: html(chapter.nodes),
        })),
      };
    })()`) as ParsedBook;
  } finally {
    await page.close();
  }
}

export const ADVENTURE_DOCX_CSS = `
  /* The approved Adventure guide uses a lighter, workbook-like chapter
     treatment than the classic illustrated edition. */
  .front-matter h1 {
    font-family: Carlito, Calibri, sans-serif;
    font-weight: 300;
  }
  .chapter > h1 {
    text-align: left;
    margin-top: 0.25in;
  }
  .chapter table {
    width: 100%;
    page-break-inside: avoid;
  }
  .chapter td {
    border-color: #dbe5ee;
  }
  .chapter img {
    max-height: 4.9in;
    object-fit: contain;
  }
`;