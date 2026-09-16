#!/usr/bin/env node
/**
 * Create editable, source-backed DOCX revisions without mutating uploads.
 *
 * The PDF build remains able to regenerate from the original manuscript
 * uploads; these copies are for editors who need the publication pages in the
 * editable source as well. The Additional Resources document is copied at the
 * OOXML level so its two original PNGs remain embedded, while relationship
 * IDs are remapped into the destination document.
 *
 * Run from the workspace root or scripts package:
 *   pnpm --filter @workspace/scripts run books:update-publication-sources
 */
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import {
  ADDITIONAL_RESOURCES_SOURCE,
  PERMISSION_BODY,
  PERMISSION_CONTACT,
  PERMISSION_HEADING,
  PERMISSION_URL,
  PERMISSION_VISIBLE_URL,
} from "./bookPublicationPages.js";

const ROOT = resolve(process.cwd(), "..");
const RESOURCE_DOCX = resolve(ROOT, ADDITIONAL_RESOURCES_SOURCE);
const OUTPUT_DIR = resolve(ROOT, "outputs/book-publication-sources");

const BOOK_SOURCES = [
  "attached_assets/Walking_in_the_Spirit_ebook_260714_1784232887203.docx",
  "attached_assets/Your_New_Identity_in_Christ_ebook_260714_1784052032853.docx",
  "attached_assets/Beholding_the_Majesty_of_God_updated_ebook_260905_1789063973152.docx",
].map(path => resolve(ROOT, path));

function run(command: string, args: string[], cwd?: string): void {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed: ${result.stderr || result.stdout}`,
    );
  }
}

function readArchiveEntry(root: string, name: string): string {
  return readFileSync(join(root, name), "utf8");
}

function maxRelationshipId(xml: string): number {
  return Math.max(
    0,
    ...[...xml.matchAll(/\bId="rId(\d+)"/g)].map(match =>
      Number(match[1]),
    ),
  );
}

function relationshipAttributes(xml: string): Array<{
  id: string;
  type: string;
  target: string;
}> {
  return [...xml.matchAll(/<Relationship\b([^>]+?)\/>/g)].map(match => {
    const attrs = match[1]!;
    const get = (name: string): string =>
      attrs.match(new RegExp(`\\b${name}="([^"]+)"`))?.[1] ?? "";
    return {
      id: get("Id"),
      type: get("Type"),
      target: get("Target"),
    };
  });
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function textRun(text: string, properties = ""): string {
  return `<w:r>${properties}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}

function decodeXmlText(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, decimal: string) =>
      String.fromCodePoint(Number(decimal)),
    );
}

function paragraphText(paragraph: string): string {
  return [...paragraph.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi)]
    .map(match => decodeXmlText(match[1]!))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function paragraphMatches(xml: string): Array<{
  start: number;
  end: number;
  xml: string;
}> {
  const paragraphs: Array<{ start: number; end: number; xml: string }> = [];
  const pattern = /<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/gi;
  for (const match of xml.matchAll(pattern)) {
    const start = match.index!;
    paragraphs.push({
      start,
      end: start + match[0].length,
      xml: match[0],
    });
  }
  return paragraphs;
}

function lastParagraphStartBefore(xml: string, offset: number): number {
  const prefix = xml.slice(0, offset);
  let start = -1;
  for (const match of prefix.matchAll(/<w:p(?:\s[^>]*)?>/gi)) {
    start = match.index!;
  }
  return start;
}

function permissionTable(hyperlinkId: string): string {
  const border = `<w:tblBorders>
    <w:top w:val="single" w:sz="14" w:space="0" w:color="0B3C5D"/>
    <w:left w:val="single" w:sz="14" w:space="0" w:color="0B3C5D"/>
    <w:bottom w:val="single" w:sz="14" w:space="0" w:color="0B3C5D"/>
    <w:right w:val="single" w:sz="14" w:space="0" w:color="0B3C5D"/>
    <w:insideH w:val="nil"/>
    <w:insideV w:val="nil"/>
  </w:tblBorders>`;
  const headingRun = textRun(
    PERMISSION_HEADING,
    `<w:rPr><w:b/><w:color w:val="0B3C5D"/></w:rPr>`,
  );
  const bodyRun = textRun(PERMISSION_BODY);
  const contactRun = textRun(`${PERMISSION_CONTACT} `);
  const linkRun = `<w:hyperlink r:id="${hyperlinkId}" w:history="1">${textRun(
    PERMISSION_VISIBLE_URL,
    `<w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr>`,
  )}</w:hyperlink>`;
  const cell = (paragraphs: string): string =>
    `<w:tc><w:tcPr><w:tcW w:w="9360" w:type="dxa"/><w:tcMar>
      <w:top w:w="120" w:type="dxa"/><w:left w:w="160" w:type="dxa"/>
      <w:bottom w:w="120" w:type="dxa"/><w:right w:w="160" w:type="dxa"/>
    </w:tcMar></w:tcPr>${paragraphs}</w:tc>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/>${border}</w:tblPr>
    <w:tr>${cell(`<w:p>${headingRun}</w:p><w:p>${bodyRun}</w:p><w:p>${contactRun}${linkRun}</w:p>`)}</w:tr>
  </w:tbl>`;
}

function removeParagraphContaining(xml: string, marker: string): string {
  const normalizedMarker = marker.replace(/\s+/g, " ").trim().toLowerCase();
  return paragraphMatches(xml).reduceRight((result, paragraph) => {
    if (!paragraphText(paragraph.xml).toLowerCase().includes(normalizedMarker)) {
      return result;
    }
    return result.slice(0, paragraph.start) + result.slice(paragraph.end);
  }, xml);
}

function firstPageBreakStart(body: string): number {
  const pageBreak = body.search(/<w:br\b[^>]*w:type="page"/i);
  if (pageBreak < 0) throw new Error("Source DOCX has no title-page break");
  const paragraphStart = lastParagraphStartBefore(body, pageBreak);
  if (paragraphStart < 0) throw new Error("Malformed title-page break paragraph");
  return paragraphStart;
}

function isResourceHeading(text: string): boolean {
  return /^(?:[A-E]\.\s*)?(?:More Free Resources|More Resources|Additional Resources)$/i.test(
    text,
  );
}

function resourceHeadingParagraph(body: string): {
  start: number;
  end: number;
  xml: string;
} {
  const headings = paragraphMatches(body).filter(paragraph =>
    isResourceHeading(paragraphText(paragraph.xml)),
  );
  const heading = headings.at(-1);
  if (!heading) {
    throw new Error("Source DOCX has no existing resources section");
  }
  return heading;
}

function replaceOldResources(body: string): string {
  return body.slice(0, resourceHeadingParagraph(body).start);
}

function replaceTextNodes(paragraph: string, text: string): string {
  const nodes = [
    ...paragraph.matchAll(/(<w:t\b[^>]*>)([\s\S]*?)(<\/w:t>)/gi),
  ];
  if (!nodes.length) return paragraph;
  let remaining = text;
  let result = "";
  let cursor = 0;
  nodes.forEach((node, nodeIndex) => {
    const index = node.index!;
    const originalText = decodeXmlText(node[2]!);
    const take = Math.min(originalText.length, remaining.length);
    let replacement = remaining.slice(0, take);
    remaining = remaining.slice(take);
    if (nodeIndex === nodes.length - 1 && remaining) {
      replacement += remaining;
      remaining = "";
    }
    result += paragraph.slice(cursor, index);
    result += `${node[1]}${escapeXml(replacement)}${node[3]}`;
    cursor = index + node[0].length;
  });
  return result + paragraph.slice(cursor);
}

function updateTocResourceLabels(body: string, resourceStart: number): string {
  const prefix = body.slice(0, resourceStart);
  const suffix = body.slice(resourceStart);
  const updatedPrefix = paragraphMatches(prefix).reduceRight(
    (result, paragraph) => {
      const text = paragraphText(paragraph.xml);
      const match = text.match(
        /^\s*(?:[A-E]\.\s*)?(?:More Free Resources|More Resources)(?=\s*\.{3,}|\s*$)/i,
      );
      if (!match) return result;
      const replacementText =
        text.slice(0, match.index!) +
        "Additional Resources" +
        text.slice(match.index! + match[0].length);
      const replacement = replaceTextNodes(paragraph.xml, replacementText);
      return (
        result.slice(0, paragraph.start) +
        replacement +
        result.slice(paragraph.end)
      );
    },
    prefix,
  );
  return updatedPrefix + suffix;
}

function copyResourceMedia(
  resourceRoot: string,
  destinationRoot: string,
  resourceFragment: string,
  sourceRelationships: string,
): {
  fragment: string;
  relationships: string;
  nextId: number;
} {
  const resourceRelationships = relationshipAttributes(
    readArchiveEntry(resourceRoot, "word/_rels/document.xml.rels"),
  );
  let nextId = maxRelationshipId(sourceRelationships);
  let fragment = resourceFragment;
  let relationships = "";
  for (const relationship of resourceRelationships) {
    if (!relationship.target.startsWith("media/")) continue;
    const newId = `rId${++nextId}`;
    fragment = fragment
      .replaceAll(`r:id="${relationship.id}"`, `r:id="${newId}"`)
      .replaceAll(`r:embed="${relationship.id}"`, `r:embed="${newId}"`);
    const sourceName = basename(relationship.target);
    const extension = sourceName.slice(sourceName.lastIndexOf("."));
    const destinationName = `publication-resources-${newId}${extension}`;
    const sourceMedia = join(resourceRoot, "word", relationship.target);
    const destinationMediaDir = join(destinationRoot, "word", "media");
    mkdirSync(destinationMediaDir, { recursive: true });
    writeFileSync(
      join(destinationMediaDir, destinationName),
      readFileSync(sourceMedia),
    );
    relationships += `<Relationship Id="${newId}" Type="${relationship.type}" Target="media/${destinationName}"/>`;
  }
  return { fragment, relationships, nextId };
}

function addResourceHyperlink(
  fragment: string,
  relationshipId: string,
): string {
  const sourceText = `Share Your Story → ${PERMISSION_VISIBLE_URL}`;
  const escapedText = escapeXml(sourceText);
  const escapedUrl = escapeXml(PERMISSION_VISIBLE_URL);
  const runMatch = fragment.match(
    new RegExp(`<w:r\\b[^>]*>[\\s\\S]*?<w:t[^>]*>${escapedText}<\\/w:t>[\\s\\S]*?<\\/w:r>`, "i"),
  );
  if (!runMatch) {
    throw new Error("Resource source hyperlink text changed");
  }
  const run = runMatch[0]!;
  const prefixRun = run.replace(
    new RegExp(`<w:t([^>]*)>${escapedText}<\\/w:t>`, "i"),
    `<w:t$1>Share Your Story → </w:t>`,
  );
  const linkRun = `<w:hyperlink r:id="${relationshipId}" w:history="1"><w:r>
    <w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr>
    <w:t>${escapedUrl}</w:t>
  </w:r></w:hyperlink>`;
  return fragment.replace(run, `${prefixRun}${linkRun}`);
}

function rewriteSource(sourceDocx: string): string {
  const sourceTemp = mkdtempSync(join(tmpdir(), "book-source-"));
  const resourceTemp = mkdtempSync(join(tmpdir(), "resource-source-"));
  try {
    run("unzip", ["-q", sourceDocx, "-d", sourceTemp]);
    run("unzip", ["-q", RESOURCE_DOCX, "-d", resourceTemp]);

    const sourceDocumentPath = join(sourceTemp, "word/document.xml");
    const sourceRelationshipsPath = join(
      sourceTemp,
      "word/_rels/document.xml.rels",
    );
    const sourceDocument = readFileSync(sourceDocumentPath, "utf8");
    let sourceRelationships = readFileSync(sourceRelationshipsPath, "utf8");
    const resourceDocument = readArchiveEntry(resourceTemp, "word/document.xml");
    const resourceBody = resourceDocument.match(
      /<w:body>([\s\S]*?)<w:sectPr\b/i,
    )?.[1];
    if (!resourceBody) throw new Error("Resource DOCX body is malformed");

    let body = sourceDocument.match(/<w:body>([\s\S]*?)<w:sectPr\b/i)?.[1];
    if (!body) throw new Error("Source DOCX body is malformed");

    body = removeParagraphContaining(body, PERMISSION_HEADING.replace(/\.$/, ""));
    body = removeParagraphContaining(body, PERMISSION_BODY);
    body = removeParagraphContaining(body, PERMISSION_CONTACT);
    const oldResourcesStart = resourceHeadingParagraph(body).start;
    body = updateTocResourceLabels(body, oldResourcesStart);
    body = replaceOldResources(body);

    let nextId = maxRelationshipId(sourceRelationships);
    const permissionLinkId = `rId${++nextId}`;
    sourceRelationships = sourceRelationships.replace(
      "</Relationships>",
      `<Relationship Id="${permissionLinkId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${PERMISSION_URL}" TargetMode="External"/></Relationships>`,
    );
    const permission = permissionTable(permissionLinkId);
    const titleBreakStart = firstPageBreakStart(body);
    body = body.slice(0, titleBreakStart) + permission + body.slice(titleBreakStart);
    /*
     * Preserve an existing standalone page-break paragraph when a source has
     * one immediately before its old resources section. Otherwise the old
     * heading's page break was discarded with the replaced paragraph, so add
     * exactly one break for the copied page.
     */
    if (!/<w:p(?:\s[^>]*)?>[\s\S]*?<w:br\b[^>]*w:type="page"[^>]*\/>\s*<\/w:r>\s*<\/w:p>\s*$/i.test(body)) {
      body += `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
    }

    const copied = copyResourceMedia(
      resourceTemp,
      sourceTemp,
      resourceBody,
      sourceRelationships,
    );
    sourceRelationships = sourceRelationships.replace(
      "</Relationships>",
      `${copied.relationships}</Relationships>`,
    );
    nextId = copied.nextId;
    const resourceLinkId = `rId${++nextId}`;
    sourceRelationships = sourceRelationships.replace(
      "</Relationships>",
      `<Relationship Id="${resourceLinkId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${PERMISSION_URL}" TargetMode="External"/></Relationships>`,
    );
    const resourceFragment = addResourceHyperlink(
      copied.fragment,
      resourceLinkId,
    );
    body += resourceFragment;

    const rewrittenDocument = sourceDocument.replace(
      /<w:body>[\s\S]*?<w:sectPr\b/i,
      `<w:body>${body}<w:sectPr`,
    );
    writeFileSync(sourceDocumentPath, rewrittenDocument);
    writeFileSync(sourceRelationshipsPath, sourceRelationships);

    mkdirSync(OUTPUT_DIR, { recursive: true });
    const output = join(
      OUTPUT_DIR,
      basename(sourceDocx).replace(/\.docx$/i, "-publication.docx"),
    );
    run("zip", ["-q", "-r", output, "."], sourceTemp);
    return output;
  } finally {
    rmSync(sourceTemp, { recursive: true, force: true });
    rmSync(resourceTemp, { recursive: true, force: true });
  }
}

for (const source of BOOK_SOURCES) {
  const output = rewriteSource(source);
  console.log(`Wrote ${output}`);
}