#!/usr/bin/env node
/**
 * Produce editable Leader Kit DOCX copies with the five Go Further book
 * mockups inserted into a new left-hand table cell. Original uploads are
 * never modified.
 */
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import mammoth from "mammoth";

const ROOT = resolve(process.cwd(), "..");
const COVER_DIR = resolve(ROOT, "artifacts/discipleship-hub/public/leader-kits/covers");

const KITS = {
  heart: {
    source: resolve(ROOT, "attached_assets/2_Heart_After_God_Leader_Kit_v.091226J_1789677319902.docx"),
    output: resolve(ROOT, "outputs/leader-kits/heart/a-heart-after-god-leader-kit-updated.docx"),
    covers: [
      ["The Adventure of Living with Jesus", "adventure-of-living-with-jesus.png"],
      ["Your New Identity in Christ", "your-new-identity-in-christ.png"],
      ["Beholding the Majesty of God", "beholding-the-majesty-of-god.png"],
      ["Walking in the Spirit", "walking-in-the-spirit.png"],
      ["Building Blocks for Maturity", "building-blocks-for-maturity.png"],
    ],
  },
  adventure: {
    source: resolve(ROOT, "attached_assets/1_This_Sunday_Leader_Kit_(ALJ_-_The_Guide)_v.091726_1789753947981.docx"),
    output: resolve(ROOT, "outputs/leader-kits/adventure/adventure-of-living-with-jesus-leader-kit-updated.docx"),
    covers: [
      ["A Heart After God", "a-heart-after-god.png"],
      ["Your New Identity in Christ", "your-new-identity-in-christ.png"],
      ["Beholding the Majesty of God", "beholding-the-majesty-of-god.png"],
      ["Walking in the Spirit", "walking-in-the-spirit.png"],
      ["Building Blocks for Maturity", "building-blocks-for-maturity.png"],
    ],
  },
} as const;

function normalizeLeaderKitUrl(text: string): string {
  return text.replace(
    /((?:https:\/\/)?equip\.jesusonline\.com)\/(?:leaders-kit|leader-kits*)/gi,
    "$1/leader-kits",
  );
}

function imageExtent(path: string): { cx: number; cy: number } {
  const result = spawnSync("identify", ["-format", "%w %h", path], { encoding: "utf8" });
  const [width, height] = result.stdout.trim().split(/\s+/).map(Number);
  if (result.status !== 0 || !width || !height) throw new Error(`Could not read image dimensions: ${path}`);
  const maxCx = 1_051_560; // 1.15in
  const maxCy = 1_508_760; // 1.65in
  const cx = Math.round(Math.min(maxCx, maxCy * (width / height)));
  const cy = Math.round(cx * (height / width));
  return { cx, cy };
}

function drawingCell(relId: string, docPrId: number, name: string, cx: number, cy: number): string {
  const safeName = name.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return `<w:tc><w:tcPr><w:tcW w:w="2600" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F7F1E3"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${docPrId}" name="${safeName}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="${safeName}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p></w:tc>`;
}

function assertXmlBalanced(xml: string, label: string) {
  const stack: string[] = [];
  const tags = xml.match(/<[^>]+>/g) ?? [];
  for (const tag of tags) {
    if (/^<\?/.test(tag) || /^<!/.test(tag) || /\/>$/.test(tag)) continue;
    const close = tag.match(/^<\/([^\s>]+)>$/);
    if (close) {
      const open = stack.pop();
      if (open !== close[1]) throw new Error(`${label}: closing ${close[1]} did not match ${open}`);
    } else {
      const open = tag.match(/^<([^\s>/]+)/)?.[1];
      if (open) stack.push(open);
    }
  }
  if (stack.length) throw new Error(`${label}: unclosed XML elements: ${stack.slice(-5).join(", ")}`);
}

async function buildOne(key: keyof typeof KITS) {
  const kit = KITS[key];
  const required = [kit.source, ...kit.covers.map(([, file]) => resolve(COVER_DIR, file))];
  const missing = required.filter(path => !existsSync(path));
  if (missing.length) throw new Error(`Missing ${key} assets:\n${missing.join("\n")}`);

  const work = mkdtempSync(resolve(tmpdir(), `leader-kit-${key}-`));
  try {
    const unzip = spawnSync("unzip", ["-q", kit.source, "-d", work], { encoding: "utf8" });
    if (unzip.status !== 0) throw new Error(`Could not unzip ${kit.source}: ${unzip.stderr}`);
    const documentPath = resolve(work, "word/document.xml");
    const relsPath = resolve(work, "word/_rels/document.xml.rels");
    let documentXml = readFileSync(documentPath, "utf8");
    let relsXml = readFileSync(relsPath, "utf8");
    const goFurtherAt = documentXml.lastIndexOf("Go Further");
    if (goFurtherAt < 0) throw new Error(`${key}: Go Further section was not found`);

    const existingRelIds = [...relsXml.matchAll(/Id="rId(\d+)"/g)].map(match => Number(match[1]));
    let nextRelId = Math.max(...existingRelIds) + 1;
    const existingDocPrIds = [...documentXml.matchAll(/<wp:docPr\b[^>]*id="(\d+)"/g)].map(match => Number(match[1]));
    let nextDocPrId = Math.max(0, ...existingDocPrIds) + 1;
    const inserted: string[] = [];
    let before = documentXml.slice(0, goFurtherAt);
    let after = documentXml.slice(goFurtherAt);

    after = after.replace(/<w:tbl>([\s\S]*?)<\/w:tbl>/g, (whole, inner: string) => {
      const tableText = inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const target = kit.covers.find(([title]) => tableText.includes(title));
      if (!target || inserted.includes(target[0])) return whole;
      const [title, coverFile] = target;
      const sourceCoverPath = resolve(COVER_DIR, coverFile);
      const { cx, cy } = imageExtent(sourceCoverPath);
      const relId = `rId${nextRelId++}`;
      const mediaName = `leader-kit-${key}-${coverFile}`;
      const mediaPath = resolve(work, "word/media", mediaName);
      const resized = spawnSync(
        "convert",
        [sourceCoverPath, "-resize", "x600>", "-strip", "-define", "png:compression-level=9", mediaPath],
        { encoding: "utf8" },
      );
      if (resized.status !== 0 || !existsSync(mediaPath)) {
        throw new Error(`${key}: could not optimize embedded mockup ${coverFile}: ${resized.stderr}`);
      }
      relsXml = relsXml.replace(
        "</Relationships>",
        `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${mediaName}"/></Relationships>`,
      );

      let table = whole.replace(
        /<w:tblGrid>[\s\S]*?<\/w:tblGrid>/,
        '<w:tblGrid><w:gridCol w:w="2600"/><w:gridCol w:w="8200"/></w:tblGrid>',
      );
      const firstCellAt = table.indexOf("<w:tc>");
      if (firstCellAt < 0) throw new Error(`${key}: ${title} table had no cell`);
      const tail = table
        .slice(firstCellAt)
        .replace(/<w:tcW w:w="\d+" w:type="dxa"\/>/, '<w:tcW w:w="8200" w:type="dxa"/>');
      table = `${table.slice(0, firstCellAt)}${drawingCell(relId, nextDocPrId++, `${title} cover`, cx, cy)}${tail}`;
      inserted.push(title);
      return table;
    });
    documentXml = normalizeLeaderKitUrl(before + after);
    relsXml = normalizeLeaderKitUrl(relsXml);
    if (inserted.length !== 5) {
      throw new Error(`${key}: inserted ${inserted.length}/5 Go Further covers (${inserted.join(", ")})`);
    }
    assertXmlBalanced(documentXml, `${key} document.xml`);
    assertXmlBalanced(relsXml, `${key} document.xml.rels`);
    writeFileSync(documentPath, documentXml);
    writeFileSync(relsPath, relsXml);

    mkdirSync(dirname(kit.output), { recursive: true });
    rmSync(kit.output, { force: true });
    const zipped = spawnSync("zip", ["-q", "-r", kit.output, "."], { cwd: work, encoding: "utf8" });
    if (zipped.status !== 0) throw new Error(`Could not write ${kit.output}: ${zipped.stderr}`);
    const zipTest = spawnSync("unzip", ["-tqq", kit.output], { encoding: "utf8" });
    if (zipTest.status !== 0) throw new Error(`${kit.output} failed ZIP validation`);

    const [sourceText, outputText] = await Promise.all([
      mammoth.extractRawText({ path: kit.source }),
      mammoth.extractRawText({ path: kit.output }),
    ]);
    const normalizedSource = normalizeLeaderKitUrl(sourceText.value).replace(/\s+/g, " ").trim();
    const normalizedOutput = outputText.value.replace(/\s+/g, " ").trim();
    if (normalizedSource !== normalizedOutput) throw new Error(`${key}: editable DOCX manuscript text changed`);
    const outputHtml = await mammoth.convertToHtml({ path: kit.output });
    const imageCount = (outputHtml.value.match(/<img\b/g) ?? []).length;
    const expectedImages = key === "heart" ? 21 : 16;
    if (imageCount !== expectedImages) {
      throw new Error(`${key}: expected ${expectedImages} images in updated DOCX, found ${imageCount}`);
    }
    const report = {
      kit: key,
      source: kit.source,
      output: kit.output,
      insertedCovers: inserted,
      manuscriptTextExactAfterUrlNormalization: true,
      relationshipsAdded: 5,
      renderedImages: imageCount,
      bytes: readFileSync(kit.output).byteLength,
    };
    writeFileSync(
      resolve(dirname(kit.output), "docx-build-report.json"),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    console.log(JSON.stringify(report, null, 2));
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

const requested = (process.argv.find(arg => arg.startsWith("--kit="))?.split("=")[1] ?? "all").toLowerCase();
const keys: Array<keyof typeof KITS> =
  requested === "all" ? ["heart", "adventure"] :
  requested === "heart" || requested === "adventure" ? [requested] :
  (() => { throw new Error(`Unknown --kit=${requested}`); })();

for (const key of keys) await buildOne(key);