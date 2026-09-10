import type { Browser } from "puppeteer";
import type { ParsedBook } from "./ebookDocxBuild.js";

/**
 * Split A Heart After God on its actual manuscript headings. The source has
 * no TOC, so the entries are derived from those headings. Other than removing
 * the manuscript's two-line title leaf (the supplied finished cover replaces
 * it), every converted body node is retained in its original order.
 */
export async function parseHeartDocx(browser: Browser, rawHtml: string): Promise<ParsedBook> {
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
      const expected = [
        ["INTRO", "Introduction"],
        ["BEFORE", "Before You Begin"],
        ["1", "1. The Heart Reflects the Person"],
        ["2", "2. God Looks at the Heart"],
        ["3", "3. Understanding the Inner Life of the Heart"],
        ["4", "4. The Need for a New Heart"],
        ["5", "5. Adoption and Fellowship — The Journey Begins"],
        ["6", "6. Relationship, Wholeheartedness, and Passion"],
        ["7", "7. The Holy Spirit and the Transformation of the Heart"],
        ["CONCL", "A Heart That Remains"],
        ["MORE", "Go Further"],
      ];
      if (text(elements[0]) !== "A Heart After God" ||
          text(elements[1]) !== "Seven Reflections on the Inner Life") {
        throw new Error("Heart manuscript title leaf changed");
      }
      const headingElements = elements.filter(el => el.tagName === "H1");
      const actual = headingElements.map(text);
      if (actual.join("\\n") !== expected.map(item => item[1]).join("\\n")) {
        throw new Error("Unexpected Heart section headings: " + actual.join(" | "));
      }
      if (elements.filter(el => el.querySelector("img")).length !== 11) {
        throw new Error("Expected all 11 Heart manuscript images");
      }
      if (elements.filter(el => el.tagName === "TABLE").length !== 4) {
        throw new Error("Expected all 4 Heart manuscript tables");
      }
      const chapters = [];
      for (let i = 0; i < expected.length; i++) {
        const heading = headingElements[i];
        const start = elements.indexOf(heading);
        const end = i + 1 < headingElements.length
          ? elements.indexOf(headingElements[i + 1])
          : elements.length;
        chapters.push({
          key: expected[i][0],
          headingHtml: heading.innerHTML,
          bodyHtml: elements.slice(start + 1, end).map(el => el.outerHTML).join("\\n"),
        });
      }
      return {
        frontPagesHtml: "",
        tocEntries: expected.map(item => ({
          kind: "entry",
          labelText: item[1],
          key: item[0],
        })),
        chapters,
      };
    })()`) as ParsedBook;
  } finally {
    await page.close();
  }
}

export const HEART_DOCX_CSS = `
  /* Avoid Chromium/Ghostscript's broken fi/fl extraction for this title. */
  body { font-variant-ligatures: none; font-feature-settings: "liga" 0, "clig" 0; }
  .chapter p:has(> img) { text-align: center; }
  .chapter img { max-height: 5.5in; object-fit: contain; }
  h1 strong, h2 strong { font-weight: inherit; }
`;