#!/usr/bin/env node
/**
 * Publication-only replacements for the two designed pages in the approved
 * Adventure PDF.
 *
 * The approved illustrated PDF is deliberately treated as the source of
 * truth.  This module does not re-typeset the book: it replaces physical PDF
 * page 2 (the title/copyright/contents page) and the final page only.  Every
 * other page, including its existing link annotations and artwork, is copied
 * from the approved PDF unchanged.
 *
 * It also contains the reproducible DOCX-source update.  The uploaded
 * manuscript is never edited in place; updateAdventureEditableDocx() unzips
 * it into a temporary directory, updates the editable copy, and writes a new
 * DOCX.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import puppeteer, { type Browser } from "puppeteer";
import { PDFDocument, PDFName } from "pdf-lib";
import {
  loadAdditionalResourcesPageHtml,
  PERMISSION_BODY as SHARED_PERMISSION_BODY,
  PERMISSION_CONTACT as SHARED_PERMISSION_CONTACT,
  PERMISSION_HEADING as SHARED_PERMISSION_HEADING,
  PERMISSION_URL as SHARED_PERMISSION_URL,
  PUBLICATION_PAGES_CSS,
} from "./bookPublicationPages.js";

export const PERMISSION_HEADING = SHARED_PERMISSION_HEADING;
export const PERMISSION_BODY = SHARED_PERMISSION_BODY;
export const PERMISSION_CONTACT = SHARED_PERMISSION_CONTACT;
export const PERMISSION_URL = SHARED_PERMISSION_URL;

const APP_URL = "https://app.jesusonline.com";
const EQUIP_URL = "https://equip.jesusonline.com";

const ROOT = resolve(process.cwd(), basename(resolve(process.cwd())) === "scripts" ? ".." : ".");
const DEFAULT_APPROVED_PDF = resolve(
  ROOT,
  "outputs/adventure-link-corrections/Adventure-Guide-Updated-Visible-Links.pdf",
);
const DEFAULT_RESOURCES_DOCX = resolve(
  ROOT,
  "attached_assets/JOM_Additional_Resources_page_1789514210420.docx",
);
const DEFAULT_MANUSCRIPT_DOCX = resolve(
  ROOT,
  "attached_assets/The_Adventure_of_Living_with_Jesus_(The_Guide)_Final_Editoria_1789076575854.docx",
);
const DEFAULT_EDITABLE_OUT = resolve(
  ROOT,
  "outputs/adventure-link-corrections/The_Adventure_of_Living_with_Jesus_Updated_Editable.docx",
);

const TITLE_COPYRIGHT = "© 2026 by JesusOnline Ministries. All rights reserved.";
const TITLE_SCRIPTURE = [
  "Unless otherwise indicated, Scripture quotations are from The Holy Bible, New International Version®, NIV®.",
  "Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.® Used by permission. All rights reserved worldwide.",
];
const TITLE_NLT =
  "Scripture quotations marked NLT are taken from the Holy Bible, New Living Translation, copyright © 1996, 2004, 2015 by Tyndale House Foundation. Used by permission of Tyndale House Publishers. All rights reserved.";
const TITLE_NASB =
  "Scripture quotations marked NASB are from the New American Standard Bible®. Copyright © The Lockman Foundation. Used by permission.";
const CONTENTS = [
  "Begin the Adventure",
  "1. Citizen of Heaven",
  "2. Your New Identity in Christ",
  "3. The Holy Spirit — Your Constant Companion",
  "4. Walking by Faith, Not by Feelings",
  "5. God’s Word — Your Road Map",
  "6. Prayer — Your Ongoing Conversation with God",
  "7. Belonging to God’s Family",
  "8. Living a Life of Purpose",
  "Continuing with Jesus",
  "Additional Resources",
];

const RESOURCE_THOUGHTS =
  "Leave a Review or Send Us a Note — If you found this helpful, please consider leaving a short review. Your feedback helps us improve future resources and encourages others. We love hearing how God is using these materials in your life.";
const RESOURCE_APP_BODY =
  "The JO App helps believers grow closer to Jesus through Bible studies, daily devotionals, prayer tools, and discipleship series. Most users explore the content on their own. Those who want personal guidance are supported by our Discipleship Pastor and trained volunteers.";
const RESOURCE_EQUIP_BODY =
  "JO EQUIP is a free digital library of practical, biblically grounded tools that equip pastors and disciple-makers with Evidence, Growth, and Church resources—uniting apologetics, identity-centered discipleship, and tools for healthy churches in one trusted hub.";

interface RenderedPageOptions {
  title: string;
  body: string;
}

export interface AdventurePublicationBuildOptions {
  /** Approved illustrated PDF; this file is only read, never modified. */
  approvedPdfPath: string;
  /** New PDF path. It may equal approvedPdfPath; a temporary output is used. */
  outputPdfPath: string;
  /** Attachment containing the exact resources copy and its two images. */
  resourcesDocxPath?: string;
  /** Optional review PNG directory (title page and final page are rendered). */
  reviewDir?: string;
}

export interface EditableAdventureDocxOptions {
  manuscriptDocxPath: string;
  outputDocxPath: string;
  resourcesDocxPath?: string;
}

function assertFile(path: string, label: string): void {
  if (!existsSync(path)) throw new Error(`${label} not found: ${path}`);
}

function readZipEntry(zipPath: string, entry: string): Buffer {
  const result = spawnSync("unzip", ["-p", zipPath, entry], {
    encoding: "buffer",
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.status !== 0 || !result.stdout || result.stdout.length === 0) {
    throw new Error(`Unable to read ${entry} from ${zipPath}: ${result.stderr?.toString() ?? ""}`);
  }
  return Buffer.from(result.stdout);
}

function readZipText(zipPath: string, entry: string): string {
  return readZipEntry(zipPath, entry).toString("utf8");
}

function dataUri(bytes: Buffer, mime: string): string {
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

function htmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function resourcesImages(resourcesDocxPath: string): { app: Buffer; equip: Buffer } {
  const documentXml = readZipText(resourcesDocxPath, "word/document.xml");
  const rels = readZipText(resourcesDocxPath, "word/_rels/document.xml.rels");
  const documentText = documentXml
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  /* These guards ensure the page is rebuilt from the supplied attachment,
     rather than silently drifting to hand-authored copy or unrelated images. */
  for (const text of [
    "Additional Resources",
    "Share Your Thoughts",
    "Share Your Story",
    "The JO Discipleship App",
    "The JO EQUIP Resources for Discipleship",
    RESOURCE_APP_BODY,
    RESOURCE_EQUIP_BODY,
  ]) {
    if (!documentText.includes(text)) {
      throw new Error(`Resources attachment is missing expected text: ${text}`);
    }
  }
  const relationshipTarget = (id: string): string => {
    const m = rels.match(new RegExp(`<Relationship\\s+Id="${id}"[^>]*Target="([^"]+)"`));
    if (!m) throw new Error(`Resources attachment is missing relationship ${id}`);
    return m[1]!.replace(/^\//, "");
  };
  return {
    app: readZipEntry(resourcesDocxPath, `word/${relationshipTarget("rId4")}`),
    equip: readZipEntry(resourcesDocxPath, `word/${relationshipTarget("rId5")}`),
  };
}

function titlePageHtml(): string {
  const contents = CONTENTS.map(text => `<li>${htmlEscape(text)}</li>`).join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  @page { size: Letter; margin: 0; }
  ${PUBLICATION_PAGES_CSS}
  html, body { margin: 0; padding: 0; width: 8.5in; height: 11in; }
  body {
    box-sizing: border-box; padding: 0.47in 0.72in 0.38in;
    font-family: Arial, Helvetica, sans-serif; color: #202020; font-size: 9.45pt;
    line-height: 1.34;
  }
  .title { text-align: center; font-size: 19pt; margin: 0; line-height: 1.15; }
  .subtitle { text-align: center; font-size: 12pt; font-style: italic; margin: 0.06in 0 0.37in; }
  .copyright, .scripture, .nlt, .nasb { margin: 0 0 0.13in; }
  .copyright { margin-bottom: 0.24in; }
  .scripture { margin-bottom: 0.08in; }
  .nasb { margin-bottom: 0.19in; }
  .contents { margin: 0 0 0.13in; padding: 0; list-style: none; }
  .contents-title { color: #23516c; font-weight: 700; font-size: 11pt; margin: 0 0 0.09in; }
  .contents li { margin: 0 0 0.074in; }
  .permission {
    position: absolute; left: 0.72in; right: 0.72in; bottom: 0.55in;
    border: 1.3px solid #23516c; background: #f3f7fa; border-radius: 3px;
    padding: 0.105in 0.14in 0.09in;
    font-size: 8.55pt; line-height: 1.27;
  }
  .permission h2 { color: #23516c; font-size: 10pt; margin: 0 0 0.04in; }
  .permission p { margin: 0 0 0.055in; }
  .permission p:last-child { margin-bottom: 0; }
  a { color: #a64800; text-decoration: underline; }
  .footer {
    position: absolute; left: 0.72in; right: 0.72in; bottom: 0.16in;
    border-top: 0.6px solid #b8b8b8; padding-top: 0.09in;
    text-align: center; color: #777; font-size: 7.2pt;
  }
</style>
</head>
<body>
  <h1 class="title">The Adventure of Living with Jesus</h1>
  <p class="subtitle">A Guide to Discovering Your New Life</p>
  <p class="copyright">${htmlEscape(TITLE_COPYRIGHT)}</p>
  <p class="scripture">${htmlEscape(TITLE_SCRIPTURE[0])}<br />${htmlEscape(TITLE_SCRIPTURE[1])}</p>
  <p class="nlt">${htmlEscape(TITLE_NLT)}</p>
  <p class="nasb">${htmlEscape(TITLE_NASB)}</p>
  <h2 class="contents-title">Contents</h2>
  <ol class="contents">${contents}</ol>
  <section class="permission">
    <h2>${htmlEscape(PERMISSION_HEADING)}</h2>
    <p>${htmlEscape(PERMISSION_BODY)}</p>
    <p>${htmlEscape(PERMISSION_CONTACT)}
      <a href="${PERMISSION_URL}">${htmlEscape(PERMISSION_URL.replace(/^https?:\/\//, ""))}</a>
    </p>
  </section>
  <div class="footer">JesusOnline Ministries&nbsp;&nbsp; · &nbsp;&nbsp;Page 1</div>
</body>
</html>`;
}

function resourcesPageHtml(resourcesDocxPath: string): string {
  const images = resourcesImages(resourcesDocxPath);
  const appImage = dataUri(images.app, "image/png");
  const equipImage = dataUri(images.equip, "image/png");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  @page { size: Letter; margin: 0; }
  html, body { margin: 0; padding: 0; width: 8.5in; height: 11in; }
  body {
    box-sizing: border-box; padding: 0.43in 0.72in 0.42in;
    font-family: Arial, Helvetica, sans-serif; color: #202020; font-size: 10pt;
    line-height: 1.27;
  }
  h1 {
    color: #23516c; font-size: 20pt; line-height: 1.12; margin: 0 0 0.17in;
    padding-bottom: 0.06in; border-bottom: 1.2px solid #c45c26;
  }
  h2 { color: #23516c; font-size: 12.5pt; line-height: 1.15; margin: 0.13in 0 0.055in; }
  p { margin: 0 0 0.085in; }
  .thoughts { margin-bottom: 0.11in; }
  .image-link { display: block; text-align: center; line-height: 0; margin: 0.01in 0 0.07in; }
  .app-image { width: 5.65in; height: auto; }
  .equip-image { width: 5.76in; height: auto; }
  a { color: #a64800; text-decoration: underline; }
  .footer {
    position: absolute; left: 0.72in; right: 0.72in; bottom: 0.16in;
    border-top: 0.6px solid #b8b8b8; padding-top: 0.09in;
    text-align: center; color: #777; font-size: 7.2pt;
  }
</style>
</head>
<body>
  <h1>Additional Resources</h1>
  <h2>Share Your Thoughts</h2>
  <p class="thoughts"><strong>Leave a Review or Send Us a Note</strong> — If you found this helpful, please consider leaving a short review. Your feedback helps us improve future resources and encourages others. We love hearing how God is using these materials in your life.<br />
  Share Your Story → <a href="${PERMISSION_URL}">equip.jesusonline.com/reviews/share</a></p>
  <h2>The JO Discipleship App</h2>
  <p>${htmlEscape(RESOURCE_APP_BODY)}</p>
  <a class="image-link" href="${APP_URL}"><img class="app-image" src="${appImage}" alt="The JO Discipleship App" /></a>
  <h2>The JO EQUIP Resources for Discipleship</h2>
  <p>${htmlEscape(RESOURCE_EQUIP_BODY)}</p>
  <a class="image-link" href="${EQUIP_URL}"><img class="equip-image" src="${equipImage}" alt="JO EQUIP" /></a>
  <div class="footer">JesusOnline Ministries&nbsp;&nbsp; · &nbsp;&nbsp;Page 33</div>
</body>
</html>`;
}

function chromiumPath(): string {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  const result = spawnSync("which", ["chromium"], { encoding: "utf8" });
  const path = result.stdout?.trim();
  if (path && existsSync(path)) return path;
  throw new Error("No Chromium found. Set PUPPETEER_EXECUTABLE_PATH or install chromium.");
}

async function renderHtmlPage(browser: Browser, options: RenderedPageOptions, outPath: string): Promise<void> {
  const page = await browser.newPage();
  try {
    await page.setRequestInterception(true);
    page.on("request", request => {
      if (request.url().startsWith("data:") || request.url().startsWith("about:")) request.continue();
      else request.abort();
    });
    await page.setContent(options.body, { waitUntil: "load", timeout: 60_000 });
    await page.pdf({
      path: outPath,
      width: "8.5in",
      height: "11in",
      printBackground: true,
      displayHeaderFooter: false,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      pageRanges: "1",
    });
  } finally {
    await page.close();
  }
}

function renderReviewPages(pdfPath: string, reviewDir: string): void {
  mkdirSync(reviewDir, { recursive: true });
  const result = spawnSync(
    "mutool",
    ["draw", "-r", "120", "-o", join(reviewDir, "adventure-page-%d.png"), pdfPath, "2,34"],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(`mutool review render failed: ${result.stderr}`);
  /* mutool names the selected pages according to their source page number. */
  for (const pageNo of [2, 34]) {
    if (!existsSync(join(reviewDir, `adventure-page-${pageNo}.png`))) {
      throw new Error(`Review render did not create page ${pageNo} in ${reviewDir}`);
    }
  }
}

function extractPdfText(pdfPath: string): string {
  const result = spawnSync("pdftotext", ["-layout", pdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error(`pdftotext failed: ${result.stderr}`);
  return result.stdout;
}

export async function verifyAdventurePublication(pdfPath: string, sourcePdfPath?: string): Promise<void> {
  assertFile(pdfPath, "Adventure publication PDF");
  const text = extractPdfText(pdfPath);
  const pages = text.split("\f");
  if (pages.length < 34) throw new Error(`Expected at least 34 PDF pages, got ${pages.length - 1}`);
  const title = pages[1] ?? "";
  const ending = pages[33] ?? "";
  const normalized = (value: string) =>
    value
      .replace(/([\p{L}])-\s+([\p{L}])/gu, "$1-$2")
      .replace(/\s+/g, " ")
      .trim();
  const normalizedTitle = normalized(title);
  const normalizedEnding = normalized(ending);
  for (const required of [TITLE_COPYRIGHT, ...TITLE_SCRIPTURE, TITLE_NLT, TITLE_NASB, ...CONTENTS]) {
    if (!normalizedTitle.includes(normalized(required))) throw new Error(`Title page is missing preserved text: ${required}`);
  }
  for (const required of [PERMISSION_HEADING, PERMISSION_BODY, PERMISSION_CONTACT, "equip.jesusonline.com/reviews/share"]) {
    if (!normalizedTitle.includes(normalized(required))) throw new Error(`Title page is missing permission text: ${required}`);
  }
  if (title.includes("If you are walking someone through these pages")) {
    throw new Error("Old Adventure permission invitation remains on title page");
  }
  for (const required of ["Additional Resources", "Share Your Thoughts", RESOURCE_THOUGHTS, "The JO Discipleship App", RESOURCE_APP_BODY, "The JO EQUIP Resources for Discipleship", RESOURCE_EQUIP_BODY]) {
    if (!normalizedEnding.includes(normalized(required))) throw new Error(`Resources page is missing text: ${required}`);
  }
  const publication = await PDFDocument.load(readFileSync(pdfPath));
  const links = new Set<string>();
  for (const pageIndex of [1, publication.getPageCount() - 1]) {
    const annots: any = publication.getPage(pageIndex).node.get(PDFName.of("Annots"));
    for (const ref of annots?.asArray?.() ?? []) {
      const annotation: any = publication.context.lookup(ref);
      const action = annotation?.lookup?.(PDFName.of("A"));
      const uri = action?.lookup?.(PDFName.of("URI"))?.decodeText?.();
      if (uri) links.add(uri.replace(/\/$/, ""));
    }
  }
  for (const uri of [PERMISSION_URL, APP_URL, EQUIP_URL]) {
    if (!links.has(uri.replace(/\/$/, ""))) throw new Error(`Expected live PDF link is missing: ${uri}`);
  }
  if (sourcePdfPath) {
    const sourcePages = extractPdfText(sourcePdfPath).split("\f");
    if (sourcePages.length !== pages.length) {
      throw new Error(`Page count changed: approved=${sourcePages.length - 1}, output=${pages.length - 1}`);
    }
    /* Page 3 through the penultimate page must remain text-identical. */
    for (let i = 2; i < pages.length - 2; i++) {
      if (pages[i] !== sourcePages[i]) throw new Error(`Untouched PDF page changed: physical page ${i + 1}`);
    }
  }
}

/**
 * Replace only page 2 and the final page of the approved PDF.
 *
 * The optional browser argument is used by ebookDocxBuild.ts so its existing
 * Chromium session can render these two pages without launching another
 * browser.  Calling this function directly launches and closes its own
 * browser.
 */
export async function buildAdventurePublicationPages(
  options: AdventurePublicationBuildOptions,
  existingBrowser?: Browser,
): Promise<void> {
  const resourcesDocxPath = options.resourcesDocxPath ?? DEFAULT_RESOURCES_DOCX;
  assertFile(options.approvedPdfPath, "Approved Adventure PDF");
  assertFile(resourcesDocxPath, "Additional Resources attachment");
  mkdirSync(dirname(options.outputPdfPath), { recursive: true });
  const workDir = mkdtempSync(join(tmpdir(), "adventure-publication-"));
  let browser = existingBrowser;
  let ownsBrowser = false;
  try {
    if (!browser) {
      browser = await puppeteer.launch({
        headless: true,
        executablePath: chromiumPath(),
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      });
      ownsBrowser = true;
    }
    /* Run the shared source conversion as a guard before the Adventure-specific
       one-page compositor reads the attachment's image relationships. */
    await loadAdditionalResourcesPageHtml(resourcesDocxPath);
    const titlePath = join(workDir, "title.pdf");
    const resourcesPath = join(workDir, "resources.pdf");
    await renderHtmlPage(browser, { title: "Adventure title page", body: titlePageHtml() }, titlePath);
    await renderHtmlPage(browser, { title: "Adventure additional resources", body: resourcesPageHtml(resourcesDocxPath) }, resourcesPath);

    const source = await PDFDocument.load(readFileSync(options.approvedPdfPath));
    if (source.getPageCount() < 2) throw new Error(`Approved Adventure PDF has too few pages: ${source.getPageCount()}`);
    const finalIndex = source.getPageCount() - 1;
    const titleDoc = await PDFDocument.load(readFileSync(titlePath));
    const resourcesDoc = await PDFDocument.load(readFileSync(resourcesPath));
    const [titlePage] = await source.copyPages(titleDoc, [0]);
    const [resourcesPage] = await source.copyPages(resourcesDoc, [0]);
    source.removePage(finalIndex);
    source.insertPage(finalIndex, resourcesPage);
    source.removePage(1);
    source.insertPage(1, titlePage);

    const tempOutput = `${options.outputPdfPath}.tmp-${process.pid}`;
    writeFileSync(tempOutput, await source.save());
    rmSync(options.outputPdfPath, { force: true });
    /* rename is intentionally done only after the PDF is complete. */
    spawnSync("mv", [tempOutput, options.outputPdfPath]);
    if (options.reviewDir) renderReviewPages(options.outputPdfPath, options.reviewDir);
    await verifyAdventurePublication(options.outputPdfPath, options.approvedPdfPath);
  } finally {
    if (ownsBrowser && browser) await browser.close();
    rmSync(workDir, { recursive: true, force: true });
  }
}

function nextRelationshipId(relsXml: string): string {
  const ids = [...relsXml.matchAll(/Id="rId(\d+)"/g)].map(m => Number(m[1]));
  return `rId${(ids.length ? Math.max(...ids) : 0) + 1}`;
}

function addRelationship(relsXml: string, id: string, type: string, target: string, external = true): string {
  const relationship = `<Relationship Id="${id}" Type="${type}" Target="${target}"${external ? ' TargetMode="External"' : ""}/>`;
  return relsXml.replace("</Relationships>", `${relationship}</Relationships>`);
}

function xmlRun(text: string, options: { bold?: boolean; color?: string } = {}): string {
  const rPr = [
    options.bold ? "<w:b/><w:bCs/>" : "",
    options.color ? `<w:color w:val="${options.color}"/>` : "",
  ].join("");
  return `<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ""}<w:t>${xmlEscape(text)}</w:t></w:r>`;
}

function hyperlinkRun(id: string, text: string): string {
  return `<w:hyperlink r:id="${id}"><w:r><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr><w:t>${xmlEscape(text)}</w:t></w:r></w:hyperlink>`;
}

function simpleParagraph(text: string, style?: string): string {
  return `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ""}${xmlRun(text)}</w:p>`;
}

function imageDrawing(relId: string, width: number, height: number, name: string, id: number): string {
  return `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${width}" cy="${height}"/><wp:docPr id="${id}" name="${xmlEscape(name)}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="${xmlEscape(name)}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${width}" cy="${height}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`;
}

function linkedImageParagraph(imageRelId: string, imageLinkId: string, width: number, height: number, name: string): string {
  const id = name === "The JO Discipleship App" ? 1101 : 1102;
  return `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="160" w:after="80"/></w:pPr><w:hyperlink r:id="${imageLinkId}"><w:r><w:rPr><w:noProof/></w:rPr>${imageDrawing(imageRelId, width, height, name, id)}</w:r></w:hyperlink></w:p>`;
}

function pngDimensions(image: Buffer): { width: number; height: number } {
  if (image.length < 24 || image.readUInt32BE(0) !== 0x89504e47) {
    throw new Error("Additional Resources image is not a valid PNG");
  }
  return { width: image.readUInt32BE(16), height: image.readUInt32BE(20) };
}

function updatedResourcesXml(rels: {
  review: string;
  app: string;
  equip: string;
  appImage: string;
  equipImage: string;
  appImageSize: { width: number; height: number };
  equipImageSize: { width: number; height: number };
}): string {
  const shareText = "Share Your Story → equip.jesusonline.com/reviews/share";
  const appWidth = 5163820;
  const equipWidth = 5268939;
  const appHeight = Math.round(appWidth * rels.appImageSize.height / rels.appImageSize.width);
  const equipHeight = Math.round(equipWidth * rels.equipImageSize.height / rels.equipImageSize.width);
  return [
    simpleParagraph("Additional Resources", "Heading1"),
    simpleParagraph("Share Your Thoughts", "Heading2"),
    `<w:p>${xmlRun("Leave a Review or Send Us a Note", { bold: true })}${xmlRun(" — If you found this helpful, please consider leaving a short review. Your feedback helps us improve future resources and encourages others. We love hearing how God is using these materials in your life.")}${xmlRun(" ") }${hyperlinkRun(rels.review, shareText)}</w:p>`,
    simpleParagraph("The JO Discipleship App", "Heading2"),
    simpleParagraph(RESOURCE_APP_BODY),
    linkedImageParagraph(rels.appImage, rels.app, appWidth, appHeight, "The JO Discipleship App"),
    simpleParagraph("The JO EQUIP Resources for Discipleship", "Heading2"),
    simpleParagraph(RESOURCE_EQUIP_BODY),
    linkedImageParagraph(rels.equipImage, rels.equip, equipWidth, equipHeight, "JO EQUIP"),
  ].join("");
}

function permissionTableXml(permissionRelId: string): string {
  const tableWidth = 10080;
  const cellProperties = `<w:tc><w:tcPr><w:tcW w:w="${tableWidth}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F3F7FA"/><w:tcMar><w:top w:w="120" w:type="dxa"/><w:start w:w="160" w:type="dxa"/><w:bottom w:w="90" w:type="dxa"/><w:end w:w="160" w:type="dxa"/></w:tcMar></w:tcPr>`;
  const borders = `<w:tblBorders><w:top w:val="single" w:sz="12" w:space="0" w:color="23516C"/><w:start w:val="single" w:sz="12" w:space="0" w:color="23516C"/><w:bottom w:val="single" w:sz="12" w:space="0" w:color="23516C"/><w:end w:val="single" w:sz="12" w:space="0" w:color="23516C"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="${tableWidth}" w:type="dxa"/><w:tblLayout w:type="fixed"/>${borders}</w:tblPr><w:tblGrid><w:gridCol w:w="${tableWidth}"/></w:tblGrid><w:tr>${cellProperties}<w:p><w:pPr><w:spacing w:after="70"/><w:rPr><w:color w:val="23516C"/></w:rPr></w:pPr>${xmlRun(PERMISSION_HEADING, { bold: true, color: "23516C" })}</w:p><w:p><w:pPr><w:spacing w:after="70"/></w:pPr>${xmlRun(PERMISSION_BODY)}</w:p><w:p><w:pPr><w:spacing w:after="0"/></w:pPr>${xmlRun(PERMISSION_CONTACT)}${xmlRun(" ")}${hyperlinkRun(permissionRelId, "equip.jesusonline.com/reviews/share")}</w:p></w:tc></w:tr></w:tbl>`;
}

function replacePermissionBlock(documentXml: string, permissionRelId: string): string {
  const headingMarker = PERMISSION_HEADING;
  const oldMarker = "If you are walking someone through these pages";
  const headingIndex = documentXml.indexOf(headingMarker);
  const invitationIndex = documentXml.indexOf(oldMarker);
  if (headingIndex < 0 || invitationIndex < 0) throw new Error("Editable Adventure manuscript permission block not found");
  const blockStart = documentXml.lastIndexOf("<w:p ", headingIndex);
  const invitationEnd = documentXml.indexOf("</w:p>", invitationIndex);
  if (blockStart < 0 || invitationEnd < 0) throw new Error("Could not locate editable permission block");
  const firstPageBreak = documentXml.indexOf('<w:br w:type="page"');
  const breakParagraphStart = documentXml.lastIndexOf("<w:p ", firstPageBreak);
  if (firstPageBreak < 0 || breakParagraphStart < 0 || breakParagraphStart < invitationEnd) {
    throw new Error("Could not locate title-page break for permission table");
  }
  const withoutOldBlock =
    documentXml.slice(0, blockStart) +
    documentXml.slice(invitationEnd + "</w:p>".length);
  const adjustedBreakStart =
    breakParagraphStart - (invitationEnd + "</w:p>".length - blockStart);
  return withoutOldBlock.slice(0, adjustedBreakStart) +
    permissionTableXml(permissionRelId) +
    withoutOldBlock.slice(adjustedBreakStart);
}

/**
 * Write an editable manuscript copy with the exact permission invitation and
 * the supplied Additional Resources copy/images.  The uploaded source is
 * copied to a temporary directory and is never changed.
 */
export function updateAdventureEditableDocx(options: EditableAdventureDocxOptions): void {
  const resourcesDocxPath = options.resourcesDocxPath ?? DEFAULT_RESOURCES_DOCX;
  assertFile(options.manuscriptDocxPath, "Adventure manuscript DOCX");
  assertFile(resourcesDocxPath, "Additional Resources attachment");
  const outputDocxPath = resolve(options.outputDocxPath);
  mkdirSync(dirname(outputDocxPath), { recursive: true });
  const workDir = mkdtempSync(join(tmpdir(), "adventure-editable-"));
  try {
    const extractDir = join(workDir, "docx");
    mkdirSync(extractDir, { recursive: true });
    const unzip = spawnSync("unzip", ["-q", options.manuscriptDocxPath, "-d", extractDir], { encoding: "utf8" });
    if (unzip.status !== 0) throw new Error(`Unable to unpack Adventure manuscript: ${unzip.stderr}`);

    const documentPath = join(extractDir, "word/document.xml");
    const relsPath = join(extractDir, "word/_rels/document.xml.rels");
    let documentXml = readFileSync(documentPath, "utf8");
    let relsXml = readFileSync(relsPath, "utf8");
    const relationshipType = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
    const reviewRel = nextRelationshipId(relsXml);
    relsXml = addRelationship(relsXml, reviewRel, `${relationshipType}/hyperlink`, PERMISSION_URL);
    documentXml = replacePermissionBlock(documentXml, reviewRel);
    const appRel = nextRelationshipId(relsXml);
    relsXml = addRelationship(relsXml, appRel, `${relationshipType}/hyperlink`, APP_URL);
    const equipRel = nextRelationshipId(relsXml);
    relsXml = addRelationship(relsXml, equipRel, `${relationshipType}/hyperlink`, EQUIP_URL);
    const appImageRel = nextRelationshipId(relsXml);
    relsXml = addRelationship(relsXml, appImageRel, `${relationshipType}/image`, "media/image11.png", false);
    const equipImageRel = nextRelationshipId(relsXml);
    relsXml = addRelationship(relsXml, equipImageRel, `${relationshipType}/image`, "media/image12.png", false);

    const bodyEnd = documentXml.lastIndexOf("</w:body>");
    const oldResourcesText = documentXml.lastIndexOf("<w:t>Additional Resources</w:t>");
    if (bodyEnd < 0 || oldResourcesText < 0) throw new Error("Editable Adventure manuscript has no final Additional Resources section");
    const oldResourcesStart = documentXml.lastIndexOf("<w:p ", oldResourcesText);
    const sectPrStart = documentXml.lastIndexOf("<w:sectPr", bodyEnd);
    if (oldResourcesStart < 0 || oldResourcesStart >= bodyEnd || sectPrStart < oldResourcesStart) {
      throw new Error("Could not locate final Additional Resources section or original sectPr");
    }
    const originalSectPr = documentXml.slice(sectPrStart, bodyEnd);
    const images = resourcesImages(resourcesDocxPath);
    const newResources = updatedResourcesXml({
      review: reviewRel,
      app: appRel,
      equip: equipRel,
      appImage: appImageRel,
      equipImage: equipImageRel,
      appImageSize: pngDimensions(images.app),
      equipImageSize: pngDimensions(images.equip),
    });
    documentXml = documentXml.slice(0, oldResourcesStart) + newResources + originalSectPr + documentXml.slice(bodyEnd);
    writeFileSync(documentPath, documentXml);
    writeFileSync(relsPath, relsXml);

    writeFileSync(join(extractDir, "word/media/image11.png"), images.app);
    writeFileSync(join(extractDir, "word/media/image12.png"), images.equip);

    const tempOutput = join(workDir, `updated-${process.pid}.docx`);
    rmSync(tempOutput, { force: true });
    const zip = spawnSync("zip", ["-q", "-r", tempOutput, "."], { cwd: extractDir, encoding: "utf8" });
    if (zip.status !== 0) throw new Error(`Unable to create updated Adventure DOCX: ${zip.stderr}`);
    rmSync(outputDocxPath, { force: true });
    spawnSync("mv", [tempOutput, outputDocxPath]);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find(arg => arg.startsWith(prefix))?.slice(prefix.length);
}

async function cli(): Promise<void> {
  const command = process.argv.find(arg => arg === "--editable" || arg === "--pdf") ?? "--pdf";
  if (command === "--editable") {
    updateAdventureEditableDocx({
      manuscriptDocxPath: parseArg("manuscript") ?? DEFAULT_MANUSCRIPT_DOCX,
      outputDocxPath: parseArg("out") ?? DEFAULT_EDITABLE_OUT,
      resourcesDocxPath: parseArg("resources") ?? DEFAULT_RESOURCES_DOCX,
    });
    console.log(`Wrote updated editable Adventure DOCX: ${parseArg("out") ?? DEFAULT_EDITABLE_OUT}`);
    return;
  }
  const approved = parseArg("approved") ?? DEFAULT_APPROVED_PDF;
  const output = parseArg("out") ?? resolve(ROOT, "outputs/adventure-link-corrections/Adventure-Publication-Updated.pdf");
  await buildAdventurePublicationPages({
    approvedPdfPath: approved,
    outputPdfPath: output,
    resourcesDocxPath: parseArg("resources") ?? DEFAULT_RESOURCES_DOCX,
    reviewDir: parseArg("review-dir"),
  });
  console.log(`Wrote Adventure publication PDF: ${output}`);
}

if (process.argv[1] && /adventurePublicationPages\.(?:ts|js|mjs)$/.test(process.argv[1])) {
  cli().catch(error => {
    console.error(error);
    process.exit(1);
  });
}