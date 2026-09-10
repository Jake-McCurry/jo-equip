import type { Browser } from "puppeteer";
import type { ParsedBook } from "./ebookDocxBuild.js";

/**
 * The revised Majesty manuscript mixes Title, Normal(Web), and Heading styles
 * for chapter titles. Split on its actual numbered titles, not Word's H1s
 * (which are mainly individual attributes). Keep the manuscript's body intact.
 */
export async function parseMajestyDocx(browser: Browser, rawHtml: string): Promise<ParsedBook> {
  const page = await browser.newPage();
  try {
    await page.setRequestInterception(true);
    page.on("request", request => {
      if (/^(data:|about:)/.test(request.url())) request.continue();
      else request.abort();
    });
    await page.setContent(rawHtml, { waitUntil: "load" });
    // A string avoids tsx's injected __name helpers crossing the browser boundary.
    return await page.evaluate(`(() => {
      const text = el => el.textContent.replace(/\\s+/g, " ").trim();
      const elements = [...document.body.children];
      const tocIndex = elements.findIndex(el => text(el) === "Contents");
      const firstChapter = elements.findIndex((el, i) => i > tocIndex && text(el) === "1.");
      if (tocIndex < 0 || firstChapter < 0) throw new Error("Majesty front matter/chapter 1 not found");
      const html = nodes => nodes.map(el => el.outerHTML).join("\\n");
      const escape = value => {
        const el = document.createElement("span");
        el.textContent = value;
        return el.innerHTML;
      };
      const retag = (el, tag, className = "") => {
        const replacement = document.createElement(tag);
        replacement.innerHTML = el.innerHTML;
        if (className) replacement.className = className;
        el.replaceWith(replacement);
        return replacement;
      };
      const frontNodes = elements.slice(2, tocIndex);
      const permission = frontNodes.find(el => /^Permission to reproduce/i.test(text(el)));
      if (!permission) throw new Error("Reproduction permission missing");
      permission.id = "permission";

      const chapters = [];
      let current = null;
      for (let i = firstChapter; i < elements.length; i++) {
        let el = elements[i];
        let label = text(el);
        let key = null;
        let headingHtml = el.innerHTML;
        if (i === firstChapter) {
          key = "1";
          headingHtml = el.innerHTML + " " + elements[++i].innerHTML;
        } else if (/^[2-7]\\.\\s*\\D/.test(label) && label.length < 100) {
          key = label[0];
          headingHtml = headingHtml.replace(/^(\\d\\.)(?=[A-Z])/, "$1 ");
        } else if (label === "20 Attributes and Because Statements") {
          key = "SUMMARY";
        } else if (label === "Key Scriptures by Chapter") {
          key = "APPX";
        } else if (label === "Additional Resources") {
          key = "MORE";
        }
        if (key) {
          current = { key, headingHtml, nodes: [] };
          chapters.push(current);
          continue;
        }
        if (!current) throw new Error("Body found outside chapter");
        if (!label && !el.querySelector("img")) continue;
        // Omnipresence's Reflection label shares a paragraph with its body.
        // Split at the explicit Word line breaks, without dropping the prose.
        if (/^Reflection\\s*(?:<br\\s*\\/?\\s*>)+/i.test(el.innerHTML)) {
          const heading = document.createElement("h3");
          heading.textContent = "Reflection";
          current.nodes.push(heading);
          el.innerHTML = el.innerHTML.replace(/^Reflection\\s*(?:<br\\s*\\/?\\s*>\\s*)+/i, "");
          label = text(el);
        }
        if (/^Daily Impact$/i.test(label) || /^Word Pictures of\\b/.test(label)) {
          el = retag(el, "h2");
        } else if (/^(Questions for Personal Application|Reflection)$/i.test(label)) {
          el = retag(el, "h3");
        } else if (el.tagName === "H1") {
          el = retag(el, /^[3-6]$/.test(current.key) && /^God Is /.test(label) ? "h1" : "h2",
            /^[3-6]$/.test(current.key) && /^God Is /.test(label) ? "attribute-title" : "");
        } else if (/^H[1-6]$/.test(el.tagName) && label.length > 150) {
          // The resources description is accidentally Heading 2 in Word.
          el = retag(el, "p");
        }
        if (current.key === "1" && label.includes("Let not the wise man")) {
          if (!label.includes("Jeremiah 9:23-24")) throw new Error("Opening citation changed; review source");
          el.innerHTML = el.innerHTML.replace("Jeremiah 9:23-24", "Jeremiah 9:24");
          el.classList.add("opening-quotation");
          // The supplied correction screenshot has a regular-weight attribution.
          el.querySelectorAll("strong").forEach(strong => strong.replaceWith(...strong.childNodes));
        }
        if (/^Figure\\./.test(label)) el.classList.add("figure-caption");
        current.nodes.push(el);
      }
      const expectedKeys = ["1","2","3","4","5","6","7","SUMMARY","APPX","MORE"];
      if (chapters.map(c => c.key).join() !== expectedKeys.join()) {
        throw new Error("Unexpected Majesty chapter boundaries: " + chapters.map(c => c.key).join());
      }
      const bodyNodes = chapters.flatMap(c => c.nodes);
      for (const [pattern, tag] of [
        [/^Daily Impact$/, "H2"], [/^Questions for Personal Application$/, "H3"],
        [/^Word Pictures of\\b/, "H2"], [/^Reflection$/, "H3"],
      ]) {
        const matches = bodyNodes.filter(el => pattern.test(text(el)));
        if (matches.length !== 20 || matches.some(el => el.tagName !== tag)) {
          throw new Error("Incorrect attribute hierarchy/count: " + pattern);
        }
      }
      // Preserve explicit hyperlinks, and make the manuscript's bare resource
      // URLs clickable without altering their visible wording.
      for (const root of [...frontNodes, ...bodyNodes]) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        for (const node of nodes) {
          if (node.parentElement.closest("a")) continue;
          const pattern = /(?:https?:\\/\\/[^\\s<>]+|(?:equip\\.jesusonline\\.com|JesusOnlineMinistries\\.org)[^\\s<>]*)/gi;
          const value = node.textContent;
          const matches = [...value.matchAll(pattern)];
          if (!matches.length) continue;
          const fragment = document.createDocumentFragment();
          let cursor = 0;
          for (const match of matches) {
            const url = match[0].replace(/[.,;:)]+$/, "");
            fragment.append(value.slice(cursor, match.index));
            const anchor = document.createElement("a");
            anchor.textContent = url;
            anchor.href = /^https?:/i.test(url) ? url : "https://" + url;
            fragment.append(anchor);
            cursor = match.index + url.length;
          }
          fragment.append(value.slice(cursor));
          node.replaceWith(fragment);
        }
      }
      const tocEntries = [];
      for (const el of elements.slice(tocIndex + 1, firstChapter)) {
        const lines = el.innerHTML.split(/<br\\s*\\/?\\s*>/i).map(line => {
          const temp = document.createElement("div"); temp.innerHTML = line; return text(temp);
        }).filter(Boolean);
        if (!lines.length) continue;
        const label = lines[0];
        let key = label.match(/^([1-7])\\./)?.[1] ?? null;
        if (/^Permission to Reproduce/i.test(label)) key = "FRONT";
        if (/^Appendix:/.test(label)) {
          tocEntries.push({ kind: "entry", labelText: "20 Attributes and Because Statements", key: "SUMMARY" });
          key = "APPX";
        }
        if (label === "Additional Resources") key = "MORE";
        if (!key) throw new Error("Unmatched Majesty TOC entry: " + label);
        tocEntries.push({ kind: "entry", labelText: escape(label), key });
        if (lines.length > 1) tocEntries.push({ kind: "sub", itemsHtml: lines.slice(1).map(escape) });
      }
      const frontPagesHtml = '<section class="front-matter"><h1>Beholding the Majesty of God</h1>' +
        '<p class="subtitle"><em>Exploring His Divine Attributes</em></p>' + html(frontNodes) + '</section>';
      return {
        frontPagesHtml, tocEntries,
        chapters: chapters.map(c => ({ key: c.key, headingHtml: c.headingHtml, bodyHtml: html(c.nodes) })),
      };
    })()`) as ParsedBook;
  } finally {
    await page.close();
  }
}

export const MAJESTY_DOCX_CSS = `
  /* Chromium/GS can give fi/fl ligatures a broken text extraction order.
     Separate glyphs preserve normal search and copy/paste in the ebook. */
  body { font-variant-ligatures: none; font-feature-settings: "liga" 0, "clig" 0; }
  .attribute-title {
    font-family: Carlito, Calibri, sans-serif; font-weight: 300;
    font-size: 28pt; line-height: 1.25; color: #0b3c5d;
    margin: 1.2em 0 0.45em; break-after: avoid;
  }
  h1 strong, h2 strong { font-weight: inherit; }
  .opening-quotation, .figure-caption { text-align: center; }
  .chapter p:has(> img) { text-align: center; }
  .chapter img { max-height: 5.5in; object-fit: contain; }
  /* Keep each resources illustration with its explanatory paragraph. */
  .chapter:last-child p:has(+ p > img) { break-after: avoid; }
`;