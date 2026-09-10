#!/usr/bin/env node
/**
 * Standalone, XML-preserving review-edition builder for
 * "The Adventure of Living with Jesus".
 *
 * This builder intentionally lives below outputs/adventure-review and never
 * writes to the site, the public book pipeline, or the source manuscript.
 * It copies the source package, makes the narrowly-scoped review changes in
 * word/document.xml, and then renders a separate proof PDF from that package.
 *
 * The cleaned-artwork worker owns outputs/adventure-review/images.  When its
 * manifest exists, this script consumes those files read-only.  Before then,
 * the script may be run for an interim proof using the source artwork; the
 * audit labels that proof "interim" and the next run will become final once
 * the manifest is present.
 */

import { createRequire } from "node:module";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT_DIR = resolve(ROOT, "outputs/adventure-review");
const IMAGES_DIR = join(OUT_DIR, "images");
const SOURCE_DOCX = resolve(
  ROOT,
  "attached_assets/The_Adventure_of_Living_with_Jesus_(The_Guide)_Final_Editoria_1789076575854.docx",
);
const SOURCE_COVER = resolve(
  ROOT,
  "attached_assets/Adventure-of-Living-with-Jesus-illustrated-revised_1789076924927.jpeg",
);
const OUTPUT_DOCX = join(OUT_DIR, "The_Adventure_of_Living_with_Jesus_review_edition.docx");
const OUTPUT_PDF = join(OUT_DIR, "The_Adventure_of_Living_with_Jesus_styled_review.pdf");
const OUTPUT_HTML = join(OUT_DIR, "The_Adventure_of_Living_with_Jesus_styled_review_proof.html");
const OUTPUT_AUDIT_JSON = join(OUT_DIR, "adventure-review-styled-audit.json");
const OUTPUT_AUDIT_TXT = join(OUT_DIR, "adventure-review-styled-audit.txt");
const RENDER_DIR = join(OUT_DIR, "styled-rendered");

const puppeteer = require(require.resolve("puppeteer", { paths: [resolve(ROOT, "scripts")] }));
const mammoth = require(require.resolve("mammoth", { paths: [resolve(ROOT, "scripts")] }));
const { PDFDocument, StandardFonts, rgb } = require(require.resolve("pdf-lib", { paths: [resolve(ROOT, "scripts")] }));

const QA_TABLES = [];
const RESPONSE_GRID_TABLES = new Set([29, 38]); // source order, 1-based
const NARRATIVE_TABLES = new Set([13, 27, 34]); // Ashley, Todd, and Joni
const LIGHT_FILL = "F4F7FA";
const NAVY_FILL = "1B4F72";
const COVER_REL_TYPE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    ...options,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed (${result.status}): ${(result.stderr || result.stdout || "").slice(0, 2000)}`,
    );
  }
  return result.stdout || "";
}

function decodeXml(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripTags(value) {
  return decodeXml(value.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function normalizeForSearch(value) {
  return value
    .toLowerCase()
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/[\s\u00a0]+/g, "")
    .trim();
}

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function textNodes(xml) {
  return [...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((m) => decodeXml(m[1]));
}

function paragraphTexts(xml) {
  return [...xml.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g)]
    .map((m) => stripTags(m[1]).replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function countMatches(value, pattern) {
  return (value.match(pattern) || []).length;
}

function countFills(xml) {
  const fills = {};
  for (const match of xml.matchAll(/<w:shd\b[^>]*w:fill="([^"]+)"/g)) {
    fills[match[1]] = (fills[match[1]] || 0) + 1;
  }
  return fills;
}

function removeShadingElements(value, predicate) {
  return value.replace(/<w:shd\b[^>]*(?:\/>|>[\s\S]*?<\/w:shd>)/g, (element) =>
    predicate(element) ? "" : element,
  );
}

function sourceTables(xml, recordQa = true) {
  const tables = xml.match(/<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>/g) || [];
  return tables.map((table, index) => {
    const cells = table.match(/<w:tc(?:\s[^>]*)?>[\s\S]*?<\/w:tc>/g) || [];
    const metaCells = cells.map((cell) => {
      const fills = [...cell.matchAll(/<w:shd\b[^>]*w:fill="([^"]+)"/g)].map((m) => m[1]);
      const paragraphColors = [...cell.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)].map((p) => {
        const colors = [...p[0].matchAll(/<w:color\b[^>]*w:val="([^"]+)"/g)].map((m) => m[1]);
        return colors[0] || null;
      });
      return { fills, paragraphColors };
    });
    const text = stripTags(table);
    const isQa = /Q:|_{3,}/.test(text);
    if (isQa && recordQa) QA_TABLES.push(index + 1);
    return { index: index + 1, cells: metaCells, fills: [...table.matchAll(/<w:shd\b[^>]*w:fill="([^"]+)"/g)].map((m) => m[1]), text, isQa };
  });
}

function patchReviewXml(documentXml, sourceTableMeta) {
  const tables = documentXml.match(/<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>/g) || [];
  const patchedTables = tables.map((table, index) => {
    const tableNumber = index + 1;
    const sourceMeta = sourceTableMeta[index];
    if (sourceMeta?.isQa) {
      // Q/A and reference-only answer tables are the only broad shading
      // removal.  Narrative and teaching panels are deliberately untouched.
      return removeShadingElements(table, (element) => new RegExp(`w:fill="${LIGHT_FILL}"`, "i").test(element));
    }
    if (RESPONSE_GRID_TABLES.has(tableNumber)) {
      // These two answer grids retain their intentional navy headers.  Their
      // light-blue answer cells become ordinary white cells.
      const cells = table.match(/<w:tc(?:\s[^>]*)?>[\s\S]*?<\/w:tc>/g) || [];
      const patchedCells = cells.map((cell) => {
        if (new RegExp(`w:fill="${NAVY_FILL}"`, "i").test(cell)) return cell;
        return removeShadingElements(cell, (element) => new RegExp(`w:fill="${LIGHT_FILL}"`, "i").test(element));
      });
      let cellIndex = 0;
      return table.replace(/<w:tc(?:\s[^>]*)?>[\s\S]*?<\/w:tc>/g, () => patchedCells[cellIndex++]);
    }
    return table;
  });
  let tableIndex = 0;
  return documentXml.replace(/<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>/g, () => patchedTables[tableIndex++]);
}

function jpegDimensions(buffer) {
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 2 > buffer.length) break;
    const length = buffer.readUInt16BE(offset);
    if (marker >= 0xc0 && marker <= 0xc3) {
      return { width: buffer.readUInt16BE(offset + 5), height: buffer.readUInt16BE(offset + 3) };
    }
    offset += length;
  }
  return { width: 1051, height: 1486 };
}

function imageDimensions(filePath) {
  const buffer = readFileSync(filePath);
  if (buffer.readUInt32BE(0) === 0x89504e47) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return jpegDimensions(buffer);
  return { width: 1, height: 1 };
}

function coverDrawingXml(relationshipId, filePath) {
  const { width, height } = imageDimensions(filePath);
  // Letter page (12240 x 15840 twips) with the source's 1000-twip top and
  // bottom margins.  Fit, rather than crop, the supplied artwork.
  const maxWidth = 10080 * 635;
  const maxHeight = 13800 * 635;
  const scale = Math.min(maxWidth / width, maxHeight / height);
  const cx = Math.round(width * scale);
  const cy = Math.round(height * scale);
  return `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:noProof/></w:rPr><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="11" name="Review edition cover"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="11" name="Adventure review cover.jpeg"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relationshipId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p><w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
}

function patchRelationships(xml, overrides, coverRelationshipId) {
  let patched = xml.replace(/<Relationship\b[^>]*\/>/g, (relationship) => {
    let result = relationship;
    for (const [original, replacement] of overrides) {
      result = result.replace(`Target="media/${original}"`, `Target="media/${replacement}"`);
    }
    return result;
  });
  const coverRelationship = `<Relationship Id="${coverRelationshipId}" Type="${COVER_REL_TYPE}" Target="media/image11.jpeg"/>`;
  patched = patched.replace("</Relationships>", `${coverRelationship}</Relationships>`);
  return patched;
}

function patchContentTypes(xml, extensions) {
  let patched = xml;
  for (const extension of extensions) {
    const ext = extension.toLowerCase().replace(/^\./, "");
    if (!new RegExp(`<Default\\b[^>]*Extension="${ext}"`, "i").test(patched)) {
      const contentType = ext === "png" ? "image/png" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "application/octet-stream";
      patched = patched.replace("</Types>", `<Default Extension="${ext}" ContentType="${contentType}"/></Types>`);
    }
  }
  return patched;
}

function manifestMappings() {
  const manifestPath = join(IMAGES_DIR, "manifest.json");
  if (!existsSync(manifestPath)) return { manifestPath, present: false, mappings: new Map() };
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const mappings = new Map();
  const candidates = manifest.mapping || manifest.mappings || manifest.images || manifest.assets || manifest.files || manifest;
  const entries = Array.isArray(candidates)
    ? candidates.map((entry) => [
        entry.original || entry.source || entry.input,
        entry.cleaned || entry.output || entry.path || entry.file || entry.to,
      ])
    : Object.entries(candidates || {});
  for (const [original, rawCleanedValue] of entries) {
    const cleanedValue =
      typeof rawCleanedValue === "string"
        ? rawCleanedValue
        : rawCleanedValue?.cleaned ||
          rawCleanedValue?.output ||
          rawCleanedValue?.path ||
          rawCleanedValue?.file ||
          rawCleanedValue?.to;
    if (!original || !cleanedValue || typeof cleanedValue !== "string") continue;
    if (!/\.(png|jpe?g|webp)$/i.test(String(original))) continue;
    const cleanedPath = resolve(IMAGES_DIR, cleanedValue);
    if (existsSync(cleanedPath)) mappings.set(basename(String(original)), cleanedPath);
  }
  return { manifestPath, present: true, mappings };
}

function copyAndPatchDocx(sourceTableMeta) {
  if (!existsSync(SOURCE_DOCX)) throw new Error(`Source DOCX not found: ${SOURCE_DOCX}`);
  if (!existsSync(SOURCE_COVER)) throw new Error(`Cover artwork not found: ${SOURCE_COVER}`);
  mkdirSync(OUT_DIR, { recursive: true });
  const workDir = mkdtempSync(join("/tmp", "adventure-review-docx-"));
  const packageDir = join(workDir, "package");
  mkdirSync(packageDir, { recursive: true });
  run("unzip", ["-q", SOURCE_DOCX, "-d", packageDir]);

  const sourceMediaDir = join(packageDir, "word/media");
  const mediaNames = readdirSync(sourceMediaDir).filter((file) => /\.(png|jpe?g)$/i.test(file));
  const manifest = manifestMappings();
  if (manifest.present && manifest.mappings.size !== mediaNames.length) {
    throw new Error(
      `Artwork manifest is present but maps ${manifest.mappings.size}/${mediaNames.length} source images; refusing to call the proof final.`,
    );
  }
  const overrides = new Map();
  for (const original of mediaNames) {
    const cleanedPath = manifest.mappings.get(original);
    if (!cleanedPath) continue;
    const cleanedExtension = extname(cleanedPath).toLowerCase() || extname(original).toLowerCase();
    const replacement = `${basename(original, extname(original))}${cleanedExtension}`;
    copyFileSync(cleanedPath, join(sourceMediaDir, replacement));
    if (replacement !== original) rmSync(join(sourceMediaDir, original), { force: true });
    overrides.set(original, replacement);
  }

  const documentPath = join(packageDir, "word/document.xml");
  const relsPath = join(packageDir, "word/_rels/document.xml.rels");
  const contentTypesPath = join(packageDir, "[Content_Types].xml");
  const sourceDocumentXml = readFileSync(documentPath, "utf8");
  const relationshipXml = readFileSync(relsPath, "utf8");
  const finalDocumentXml = patchReviewXml(sourceDocumentXml, sourceTableMeta);
  const relationshipIds = [...relationshipXml.matchAll(/Id="rId(\d+)"/g)].map((m) => Number(m[1]));
  const coverRelationshipId = `rId${Math.max(...relationshipIds, 0) + 1}`;
  const coverTarget = join(sourceMediaDir, "image11.jpeg");
  copyFileSync(SOURCE_COVER, coverTarget);
  const coverXml = coverDrawingXml(coverRelationshipId, SOURCE_COVER);
  const withCover = finalDocumentXml.replace("<w:body>", `<w:body>${coverXml}`);
  writeFileSync(documentPath, withCover);
  writeFileSync(
    relsPath,
    patchRelationships(relationshipXml, overrides, coverRelationshipId),
  );
  const outputExtensions = new Set(["jpeg"]);
  for (const replacement of overrides.values()) outputExtensions.add(extname(replacement).slice(1));
  writeFileSync(contentTypesPath, patchContentTypes(readFileSync(contentTypesPath, "utf8"), outputExtensions));

  rmSync(OUTPUT_DOCX, { force: true });
  run("zip", ["-q", "-r", OUTPUT_DOCX, "."], { cwd: packageDir });
  const finalMedia = readdirSync(sourceMediaDir).filter((file) => /\.(png|jpe?g|webp)$/i.test(file));
  rmSync(workDir, { recursive: true, force: true });
  return {
    manifest,
    sourceMediaNames: mediaNames,
    finalMediaNames: finalMedia,
    sourceDocumentXml,
    finalDocumentXml: withCover,
    sourcePackageSha256: sha256(SOURCE_DOCX),
  };
}

function sourceTableMetaFromXml(xml) {
  QA_TABLES.length = 0;
  return sourceTables(xml);
}

function fillStyle(fill) {
  if (!fill) return "";
  const colors = {
    F4F7FA: "#F4F7FA",
    FBF6F1: "#FBF6F1",
    FFFBF6: "#FFFBF6",
    "1B4F72": "#1B4F72",
  };
  const background = colors[fill.toUpperCase()];
  if (!background) return "";
  return `background:${background};${fill.toUpperCase() === NAVY_FILL ? "color:#FFFFFF;" : ""}`;
}

function decorateTables(html, tableMeta) {
  let tableNumber = 0;
  return html.replace(/<table(?:\s[^>]*)?>[\s\S]*?<\/table>/g, (table) => {
    tableNumber += 1;
    const meta = tableMeta[tableNumber - 1] || { cells: [], isQa: false };
    const classes = ["source-table", `source-table-${tableNumber}`];
    if (meta.isQa) classes.push("qa-writing-table");
    if (RESPONSE_GRID_TABLES.has(tableNumber)) classes.push("response-grid");
    const classAttribute = ` class="${classes.join(" ")}"`;
    const openingEnd = table.indexOf(">") + 1;
    const opening = `${table
      .slice(0, openingEnd)
      .replace(/\s+class="[^"]*"/g, "")
      .replace(/>$/, "")}${classAttribute}>`;
    let inner = table.slice(openingEnd, -"</table>".length);
    let cellNumber = 0;
    inner = inner.replace(/<(td|th)([^>]*)>/g, (whole, tag, attrs) => {
      const cell = meta.cells[cellNumber++] || { fills: [], paragraphColors: [] };
      let fill = cell.fills.find(Boolean);
      if (meta.isQa || (RESPONSE_GRID_TABLES.has(tableNumber) && fill?.toUpperCase() === LIGHT_FILL)) fill = null;
      const style = fillStyle(fill);
      let cellInnerStart = inner.indexOf(whole); // only used to keep the code readable; paragraph colors are applied below.
      void cellInnerStart;
      return `<${tag}${attrs}${style ? ` style="${style}"` : ""}>`;
    });
    // Rehydrate source run colors at paragraph granularity for testimonies and
    // teaching panels. Mammoth has already retained bold/italic/hyperlinks.
    cellNumber = 0;
    inner = inner.replace(/<td([^>]*)>([\s\S]*?)<\/td>/g, (whole, attrs, cellInner) => {
      const cell = meta.cells[cellNumber++] || { paragraphColors: [] };
      let paragraphNumber = 0;
      const colored = cellInner.replace(/<p([^>]*)>/g, (p, pAttrs) => {
        const color = cell.paragraphColors[paragraphNumber++];
        return color ? `<p${pAttrs} style="color:#${color};">` : p;
      });
      return `<td${attrs}>${colored}</td>`;
    });
    return `${opening}${inner}</table>`;
  });
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&[a-z]+;/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function addHeadingIdsAndToc(body) {
  const headingIds = new Map();
  const usedIds = new Set();
  body = body.replace(/<h1>([\s\S]*?)<\/h1>/g, (whole, inner) => {
    const text = stripTags(inner);
    let id = `section-${slugify(text)}`;
    let suffix = 2;
    while (usedIds.has(id)) id = `section-${slugify(text)}-${suffix++}`;
    usedIds.add(id);
    headingIds.set(text, id);
    return `<h1 id="${id}">${inner}</h1>`;
  });
  const contentsStart = body.indexOf("<h2>Contents</h2>");
  const firstSection = body.indexOf("<h1 id=", contentsStart);
  if (contentsStart < 0 || firstSection < 0) return body;
  const tocArea = body.slice(contentsStart, firstSection);
  const labels = [...tocArea.matchAll(/<p>([\s\S]*?)<\/p>/g)]
    .map((m) => stripTags(m[1]))
    .filter(Boolean);
  const items = labels
    .map((label) => {
      const target = headingIds.get(label);
      return target ? `<li><a href="#${target}">${escapeHtml(label)}</a></li>` : `<li>${escapeHtml(label)}</li>`;
    })
    .join("");
  const toc = `<nav class="source-toc" aria-label="Contents"><h2>Contents</h2><ol>${items}</ol></nav>`;
  return `${body.slice(0, contentsStart)}${toc}${body.slice(firstSection)}`;
}

const PROOF_CSS = `
@page { size: A4; margin: 0.62in 0.66in 0.65in; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  color: #2C2C2C;
  font-family: Caladea, "Caladea Regular", Georgia, serif;
  font-size: 11.2pt;
  line-height: 1.42;
  font-variant-ligatures: none;
  font-feature-settings: "liga" 0, "clig" 0;
  max-width: 6.95in;
  margin: 0 auto;
}
img { display: block; max-width: 100%; height: auto; }
p { margin: 0 0 0.15in; orphans: 3; widows: 3; }
a { color: #1B4F72; text-decoration: underline; }
strong { font-family: Caladea, Georgia, serif; font-weight: 700; }
em { font-style: italic; }
h1, h2, h3, h4 {
  color: #1B4F72;
  font-family: Caladea, Georgia, serif;
  line-height: 1.18;
  break-after: avoid-page;
}
h1 {
  color: #FFFFFF;
  font-family: Carlito, Arial, sans-serif;
  font-size: 22pt;
  font-weight: 400;
  text-align: center;
  background: linear-gradient(105deg, #0D4266 0%, #287FA9 100%);
  border-bottom: 3px solid #D3A242;
  border-radius: 5px;
  padding: 0.22in 0.16in 0.18in;
  margin: 0 0 0.27in;
  break-before: page;
}
h2 { font-size: 15pt; font-weight: 700; margin: 0.23in 0 0.1in; }
h3 { font-size: 13pt; font-weight: 700; margin: 0.18in 0 0.09in; }
.cover {
  min-height: 10.1in;
  display: flex;
  justify-content: center;
  align-items: center;
  break-after: page;
  page-break-after: always;
}
.cover img { display: block; width: min(100%, 6.82in); max-height: 10.1in; object-fit: contain; }
.source-toc { break-before: page; page-break-before: always; }
.source-toc h2 {
  color: #FFFFFF;
  font-family: Carlito, Arial, sans-serif;
  font-size: 21pt;
  font-weight: 400;
  text-align: center;
  background: linear-gradient(105deg, #0D4266 0%, #287FA9 100%);
  border-bottom: 3px solid #D3A242;
  border-radius: 5px;
  padding: 0.2in 0.14in 0.15in;
  margin: 0 0 0.22in;
}
.source-toc ol { list-style: none; margin: 0; padding: 0; }
.source-toc li {
  margin: 0;
  padding: 0.08in 0.05in;
  border-bottom: 1px solid #E1E4E7;
}
.source-table {
  width: 100%;
  border-collapse: collapse;
  margin: 0.16in 0 0.2in;
  font-size: 10.9pt;
  line-height: 1.36;
  break-inside: avoid;
  page-break-inside: avoid;
}
.source-table td, .source-table th {
  border: 1px solid #D6DDE4;
  padding: 0.13in 0.14in;
  vertical-align: top;
}
.source-table p { margin: 0 0 0.1in; }
.source-table p:last-child { margin-bottom: 0; }
.source-table img { max-width: 100%; height: auto; }
.qa-writing-table {
  border-collapse: separate;
  border-spacing: 0;
  border: 1px solid #D6DDE4;
  border-radius: 6px;
  background: #FFFFFF;
  break-inside: avoid;
  page-break-inside: avoid;
}
.qa-writing-table td { background: #FFFFFF !important; border: 0; }
.qa-writing-table p:first-child {
  color: #153E59;
  font-family: Carlito, Arial, sans-serif;
  font-weight: 700;
}
.qa-writing-table .writing-line {
  color: transparent;
  font-size: 1px;
  line-height: 0.18in;
  min-height: 0.2in;
  border-bottom: 1.5px solid #7E8B99;
  margin: 0.02in 0.04in 0.05in;
}
.response-grid { font-size: 8.2pt; line-height: 1.1; }
.response-grid td { padding: 0.04in 0.045in; text-align: center; }
.response-grid td:first-child { text-align: left; }
.source-table-13,
.source-table-27,
.source-table-34 {
  border-collapse: separate;
  border-spacing: 0;
  border: 1px solid #E2DED2;
  border-left: 4px solid #D3A242;
  border-radius: 4px;
  background: #F8F3E7;
}
.source-table-13 td,
.source-table-27 td,
.source-table-34 td {
  background: #F8F3E7 !important;
  border: 0;
  padding: 0.16in 0.17in;
}
.source-table-13 strong,
.source-table-27 strong,
.source-table-34 strong { color: #153E59; }
`;

async function renderProof(sourceTableMeta) {
  const converted = await mammoth.convertToHtml(
    { path: OUTPUT_DOCX },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        const base64 = await image.read("base64");
        return { src: `data:${image.contentType};base64,${base64}` };
      }),
    },
  );
  if (converted.messages?.length) {
    writeFileSync(join(OUT_DIR, "mammoth-messages.json"), JSON.stringify(converted.messages, null, 2));
  }
  let body = converted.value;
  body = body.replace(/^<p>(\s*<img\b[\s\S]*?\/?>\s*)<\/p>/, '<div class="cover">$1</div>');
  body = addHeadingIdsAndToc(body);
  // Keep every underscore character in the HTML/PDF text stream, but render
  // the source writing space as a clean ruled line like the reference edition.
  body = body.replace(/<p>(\s*_{5,}\s*)<\/p>/g, '<p class="writing-line">$1</p>');
  body = decorateTables(body, sourceTableMeta);
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>The Adventure of Living with Jesus — Review Proof</title><style>${PROOF_CSS}</style></head><body>${body}</body></html>`;
  writeFileSync(OUTPUT_HTML, html);
  // Keep the cover in the editable DOCX and proof HTML. For PDF rendering,
  // omit it so its intrinsic image dimensions cannot affect interior layout;
  // pdf-lib prepends the exact JPEG as a contained Letter page below.
  const printBody = body.replace(/<div class="cover">[\s\S]*?<\/div>/, "");
  const printHtml = `<!doctype html><html><head><meta charset="utf-8"><title>The Adventure of Living with Jesus — Review Interior</title><style>${PROOF_CSS}</style></head><body>${printBody}</body></html>`;

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || run("which", ["chromium"]).trim(),
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  let layoutAudit;
  try {
    const page = await browser.newPage();
    await page.setContent(printHtml, { waitUntil: "networkidle0" });
    layoutAudit = await page.evaluate(() => {
      const body = document.body.getBoundingClientRect();
      const images = [...document.images].map((image) => {
        const rect = image.getBoundingClientRect();
        return { width: rect.width, right: rect.right, naturalWidth: image.naturalWidth };
      });
      const contentWidth = body.width;
      return {
        contentWidthPx: Number(contentWidth.toFixed(2)),
        maxImageWidthPx: Number(Math.max(0, ...images.map((image) => image.width)).toFixed(2)),
        maxImageNaturalWidthPx: Math.max(0, ...images.map((image) => image.naturalWidth)),
        imageOverflowCount: images.filter((image) => image.width > contentWidth + 1 || image.right > body.right + 1).length,
        documentHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    });
    await page.evaluate(() => document.fonts?.ready);
    await page.pdf({
      path: OUTPUT_PDF,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
    });
    await page.close();
  } finally {
    await browser.close();
  }
  // Chromium's paged-media counter is not implemented consistently in the
  // installed build (it renders as "0"). Add interior page numbers while
  // prepending the exact supplied JPEG as a contained, unnumbered cover.
  const interiorPdf = await PDFDocument.load(readFileSync(OUTPUT_PDF));
  const reviewPdf = await PDFDocument.create();
  const coverPage = reviewPdf.addPage([595.28, 841.89]);
  const coverImage = await reviewPdf.embedJpg(readFileSync(SOURCE_COVER));
  const coverScale = Math.min(
    coverPage.getWidth() / coverImage.width,
    coverPage.getHeight() / coverImage.height,
  );
  const coverWidth = coverImage.width * coverScale;
  const coverHeight = coverImage.height * coverScale;
  coverPage.drawImage(coverImage, {
    x: (coverPage.getWidth() - coverWidth) / 2,
    y: (coverPage.getHeight() - coverHeight) / 2,
    width: coverWidth,
    height: coverHeight,
  });
  const copiedPages = await reviewPdf.copyPages(interiorPdf, interiorPdf.getPageIndices());
  const pageNumberFont = await reviewPdf.embedFont(StandardFonts.Helvetica);
  for (const [index, page] of copiedPages.entries()) {
    reviewPdf.addPage(page);
    const label = String(index + 1);
    page.drawText(label, {
      x: page.getWidth() - 34 - label.length * 4,
      y: 18,
      size: 8,
      font: pageNumberFont,
      color: rgb(0.35, 0.40, 0.44),
    });
  }
  writeFileSync(OUTPUT_PDF, await reviewPdf.save());
  return { html, mammothMessages: converted.messages || [], layoutAudit };
}

function pdfPageCount(pdfPath) {
  const info = run("mutool", ["info", pdfPath]);
  const match = info.match(/Pages:\s*(\d+)/);
  return match ? Number(match[1]) : null;
}

function pageSelections(pdfPath, pageCount) {
  const pages = pdfText(pdfPath).split("\f");
  const findPage = (patterns, fallback) => {
    const terms = Array.isArray(patterns) ? patterns : [patterns];
    const page = pages.findIndex((text) => terms.some((term) => text.includes(term)));
    return page >= 0 ? page + 1 : fallback;
  };
  return [
    { label: "cover", page: 1 },
    { label: "toc", page: findPage("Contents", Math.min(2, pageCount || 1)) },
    { label: "chapter-banner", page: findPage("Something real has begun in your life.", Math.min(4, pageCount || 1)) },
    { label: "first-writing", page: findPage("What do you hope Jesus", Math.min(3, pageCount || 1)) },
    { label: "ashley-story", page: findPage("Ashley’s Story", Math.min(4, pageCount || 1)) },
    { label: "qa", page: findPage("What does Galatians 5:16", Math.min(6, pageCount || 1)) },
    { label: "lineart", page: findPage(["The path ahead:", "How to Walk This Path"], Math.min(4, pageCount || 1)) },
  ];
}

function renderRepresentativePages(pageCount) {
  rmSync(RENDER_DIR, { recursive: true, force: true });
  mkdirSync(RENDER_DIR, { recursive: true });
  const selections = pageSelections(OUTPUT_PDF, pageCount);
  for (const { label, page } of selections) {
    const output = join(RENDER_DIR, `${label}-page-${String(page).padStart(3, "0")}.png`);
    run("mutool", ["draw", "-q", "-F", "png", "-r", "120", "-o", output, OUTPUT_PDF, String(page)]);
  }
  return selections;
}

function pdfText(pdfPath) {
  const temp = join("/tmp", `adventure-review-${process.pid}.txt`);
  // Raw extraction keeps each table cell's text contiguous, which makes the
  // source-paragraph audit reliable for the intentionally two-column panels.
  run("pdftotext", ["-raw", pdfPath, temp]);
  const value = readFileSync(temp, "utf8");
  rmSync(temp, { force: true });
  return value;
}

function paragraphPdfAudit(sourceXml, extractedPdfText) {
  const flatPdf = normalizeForSearch(extractedPdfText);
  const paragraphs = paragraphTexts(sourceXml);
  const checked = paragraphs;
  const missing = checked.filter((paragraph) => !flatPdf.includes(normalizeForSearch(paragraph)));
  return {
    checked: checked.length,
    missing: missing.length,
    missingExamples: missing.slice(0, 10),
    allCheckedFound: missing.length === 0,
  };
}

function cellCount(xml) {
  return countMatches(xml, /<w:tc\b/g);
}

function buildAudit(sourceXml, finalXml, docxInfo, sourceTableMeta, html, pageCount, renderedPages, pdfAudit, layoutAudit, extractedPdfText) {
  const sourceNodes = textNodes(sourceXml);
  const finalNodes = textNodes(finalXml);
  const textMismatches = [];
  const max = Math.max(sourceNodes.length, finalNodes.length);
  for (let i = 0; i < max && textMismatches.length < 20; i += 1) {
    if (sourceNodes[i] !== finalNodes[i]) textMismatches.push({ index: i, source: sourceNodes[i], final: finalNodes[i] });
  }
  const finalTables = sourceTables(finalXml, false);
  const sourceFills = countFills(sourceXml);
  const finalFills = countFills(finalXml);
  const qaFinalLightFillCount = QA_TABLES.reduce((sum, tableNumber) => {
    const table = finalTables[tableNumber - 1];
    return sum + (table?.fills.filter((fill) => fill.toUpperCase() === LIGHT_FILL).length || 0);
  }, 0);
  const responseFinalLightCells = [...RESPONSE_GRID_TABLES].map((tableNumber) => {
    const table = finalTables[tableNumber - 1];
    return {
      table: tableNumber,
      lightFillCells: table?.cells.filter((cell) => cell.fills.some((fill) => fill.toUpperCase() === LIGHT_FILL)).length || 0,
      navyCells: table?.cells.filter((cell) => cell.fills.some((fill) => fill.toUpperCase() === NAVY_FILL)).length || 0,
    };
  });
  const narrativeShadingUnchanged = [...NARRATIVE_TABLES].every((tableNumber) => {
    const source = sourceTableMeta[tableNumber - 1];
    const final = finalTables[tableNumber - 1];
    return JSON.stringify(source?.fills || []) === JSON.stringify(final?.fills || []);
  });
  return {
    generatedAt: new Date().toISOString(),
    reviewStatus: "review-draft",
    source: {
      file: SOURCE_DOCX,
      sha256: docxInfo.sourcePackageSha256,
      documentXmlSha256: createHash("sha256").update(sourceXml).digest("hex"),
      textNodes: sourceNodes.length,
      substantiveParagraphs: paragraphTexts(sourceXml).length,
      tables: countMatches(sourceXml, /<w:tbl\b/g),
      cells: cellCount(sourceXml),
      inlineDrawings: countMatches(sourceXml, /<wp:inline\b/g),
      media: docxInfo.sourceMediaNames.length,
      fills: sourceFills,
    },
    output: {
      docx: OUTPUT_DOCX,
      docxBytes: statSync(OUTPUT_DOCX).size,
      pdf: OUTPUT_PDF,
      pdfBytes: statSync(OUTPUT_PDF).size,
      pdfPages: pageCount,
      proofHtml: OUTPUT_HTML,
      proofHtmlBytes: statSync(OUTPUT_HTML).size,
      pageGeometry: "A4 (595.28 × 841.89 pt)",
      renderedPages: renderedPages.map((selection) => selection.page),
      renderedRepresentativePages: renderedPages,
      coverPageTextEmpty: !extractedPdfText.split("\f")[0].trim(),
    },
    contentVerification: {
      sourceTextNodesUnchanged: sourceNodes.length === finalNodes.length && textMismatches.length === 0,
      textMismatches,
      sourceTables: countMatches(sourceXml, /<w:tbl\b/g),
      finalTables: countMatches(finalXml, /<w:tbl\b/g),
      sourceCells: cellCount(sourceXml),
      finalCells: cellCount(finalXml),
      sourceInlineDrawings: countMatches(sourceXml, /<wp:inline\b/g),
      finalInlineDrawings: countMatches(finalXml, /<wp:inline\b/g),
      pdfText: pdfAudit,
    },
    artwork: {
      manifest: docxInfo.manifest.manifestPath,
      cleanedManifestPresent: docxInfo.manifest.present,
      sourceArtworkEmbedded: docxInfo.sourceMediaNames.length === 10,
      finalArtworkEmbeddedPlusCover: docxInfo.finalMediaNames.length === 11,
      finalMediaNames: docxInfo.finalMediaNames,
      coverPrepended: /name="Adventure review cover\.jpeg"/.test(finalXml),
      coverHasNoText: !/<w:t\b/.test(coverDrawingXml("not-used", SOURCE_COVER)),
    },
    shading: {
      qaTables: QA_TABLES,
      responseGridTables: [...RESPONSE_GRID_TABLES],
      sourceFills,
      finalFills,
      qaFinalLightFillCount,
      responseFinalLightCells,
      narrativeTablesPreserved: narrativeShadingUnchanged,
      narrativeFills: Object.fromEntries([...NARRATIVE_TABLES].map((tableNumber) => [tableNumber, {
        source: sourceTableMeta[tableNumber - 1]?.fills || [],
        final: finalTables[tableNumber - 1]?.fills || [],
      }])),
    },
    proof: {
      htmlTables: countMatches(html, /<table\b/g),
      htmlImages: countMatches(html, /<img\b/g),
      htmlLinks: countMatches(html, /<a\b/g),
      tocLinks: countMatches((html.match(/<nav class="source-toc"[\s\S]*?<\/nav>/) || [""])[0], /<a\b/g),
      tocEntries: countMatches((html.match(/<nav class="source-toc"[\s\S]*?<\/nav>/) || [""])[0], /<li\b/g),
      layout: layoutAudit,
    },
  };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const sourceXmlExtractDir = mkdtempSync(join("/tmp", "adventure-review-source-"));
  run("unzip", ["-q", SOURCE_DOCX, "-d", sourceXmlExtractDir]);
  const sourceXml = readFileSync(join(sourceXmlExtractDir, "word/document.xml"), "utf8");
  const sourceTableMeta = sourceTableMetaFromXml(sourceXml);
  const docxInfo = copyAndPatchDocx(sourceTableMeta);
  const finalXml = docxInfo.finalDocumentXml;
  const { html, layoutAudit } = await renderProof(sourceTableMeta);
  const pageCount = pdfPageCount(OUTPUT_PDF);
  const renderedPages = renderRepresentativePages(pageCount);
  const extractedPdfText = pdfText(OUTPUT_PDF);
  const pdfAudit = paragraphPdfAudit(sourceXml, extractedPdfText);
  const audit = buildAudit(sourceXml, finalXml, docxInfo, sourceTableMeta, html, pageCount, renderedPages, pdfAudit, layoutAudit, extractedPdfText);
  writeFileSync(OUTPUT_AUDIT_JSON, `${JSON.stringify(audit, null, 2)}\n`);
  writeFileSync(
    OUTPUT_AUDIT_TXT,
    [
      `Review status: ${audit.reviewStatus}`,
      `DOCX: ${OUTPUT_DOCX} (${audit.output.docxBytes} bytes)`,
      `PDF: ${OUTPUT_PDF} (${audit.output.pdfBytes} bytes, ${audit.output.pdfPages} pages)`,
      `Page geometry: ${audit.output.pageGeometry}`,
      `Source tables/cells/drawings/media: ${audit.source.tables}/${audit.source.cells}/${audit.source.inlineDrawings}/${audit.source.media}`,
      `Final tables/cells/drawings/media: ${audit.contentVerification.finalTables}/${audit.contentVerification.finalCells}/${audit.contentVerification.finalInlineDrawings}/${docxInfo.finalMediaNames.length}`,
      `Source text nodes unchanged: ${audit.contentVerification.sourceTextNodesUnchanged}`,
      `QA tables: ${audit.shading.qaTables.join(", ")}`,
      `Remaining QA light shading elements: ${audit.shading.qaFinalLightFillCount}`,
      `Response grid light-fill cells (must be 0): ${audit.shading.responseFinalLightCells.map((item) => `${item.table}:${item.lightFillCells}`).join(", ")}`,
      `Narrative shading preserved: ${audit.shading.narrativeTablesPreserved}`,
      `PDF substantive paragraph audit: ${audit.contentVerification.pdfText.checked} checked, ${audit.contentVerification.pdfText.missing} missing`,
      `Print layout: ${audit.proof.layout.contentWidthPx}px content, ${audit.proof.layout.maxImageWidthPx}px max image, ${audit.proof.layout.imageOverflowCount} image overflows, horizontal overflow=${audit.proof.layout.documentHorizontalOverflow}`,
      `TOC entries/links: ${audit.proof.tocEntries}/${audit.proof.tocLinks}`,
      `PDF cover has no extracted text/page number: ${audit.output.coverPageTextEmpty}`,
      `Rendered representative pages: ${renderedPages.map((selection) => `${selection.label}=${selection.page}`).join(", ")}`,
    ].join("\n") + "\n",
  );
  rmSync(sourceXmlExtractDir, { recursive: true, force: true });
  console.log(`Built ${audit.reviewStatus} Adventure review edition: ${audit.output.pdfPages} pages, ${audit.output.pdfBytes} PDF bytes`);
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
