import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(resolve(root, 'scripts/package.json'));
const { PDFDocument, PDFName, PDFArray, PDFString } = require('pdf-lib');
const source = resolve(root, 'attached_assets/The_Adventure_of_Living_with_Jesus_(The_Guide_edition)_v.09122_1789423098075.pdf');
const out = fileURLToPath(new URL('Adventure-Guide-Corrected-Links.pdf', import.meta.url));
const positions = JSON.parse(readFileSync('/tmp/adventure-cta-positions.json', 'utf8'));
const slugs = [
  'the-need-for-a-new-heart',
  'the-gift-of-eternal-life',
  'embracing-your-new-identity-in-christ',
  'living-an-empowered-life',
  'faith-knowing-god-who-is-trustworthy',
  'renewing-the-mind-for-transformation',
  'the-lords-prayer-guide',
  'belong-and-become',
  'gods-plan-for-you',
  'your-journey-continues',
];
const expectedPages = [4, 7, 9, 14, 17, 21, 24, 27, 31, 33];
if (JSON.stringify(positions.map(p => p.page)) !== JSON.stringify(expectedPages)) {
  throw new Error('CTA page mapping differs from the inspected source');
}
const original = readFileSync(source);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const originalHash = hash(original);
const doc = await PDFDocument.load(original, { updateMetadata: false });
if (doc.isEncrypted || doc.getPageCount() !== 34) throw new Error('Unexpected source PDF');
const context = doc.context;
const updates = [];
const auditLinks = [];
const pages = doc.getPages();
for (const [i, position] of positions.entries()) {
  const page = pages[position.page - 1];
  const url = `https://follow.jesusonline.com/deeper/${slugs[i]}`;
  const annotation = context.obj({
    Type: 'Annot',
    Subtype: 'Link',
    Rect: position.rect,
    Border: [0, 0, 0],
    H: 'N',
    F: 4,
    A: { Type: 'Action', S: 'URI', URI: PDFString.of(url) },
  });
  const ref = context.register(annotation);
  const existing = page.node.lookupMaybe(PDFName.of('Annots'), PDFArray);
  const previous = existing ? existing.asArray() : [];
  page.node.set(PDFName.of('Annots'), context.obj([...previous, ref]));
  updates.push({ ref, object: annotation }, { ref: page.ref, object: page.node });
  auditLinks.push({ ...position, url, preservedAnnotations: previous.length });
}

// Append an incremental revision: retain every original byte, including all
// page content streams, artwork, fonts, metadata, outlines and existing links.
const startxref = [...original.toString('latin1').matchAll(/startxref\s+(\d+)\s+%%EOF/g)].at(-1);
if (!startxref) throw new Error('Original cross-reference offset not found');
updates.sort((a, b) => a.ref.objectNumber - b.ref.objectNumber);
const chunks = [original, Buffer.from('\n')];
let offset = original.length + 1;
const entries = [];
for (const { ref, object } of updates) {
  const bytes = Buffer.from(`${ref.objectNumber} ${ref.generationNumber} obj\n${object.toString()}\nendobj\n`, 'latin1');
  entries.push({ ref, offset });
  chunks.push(bytes);
  offset += bytes.length;
}
const xrefOffset = offset;
let xref = 'xref\n';
for (const entry of entries) {
  xref += `${entry.ref.objectNumber} 1\n${String(entry.offset).padStart(10, '0')} ${String(entry.ref.generationNumber).padStart(5, '0')} n \n`;
}
const trailer = context.obj({
  Size: context.largestObjectNumber + 1,
  Root: context.trailerInfo.Root,
  Info: context.trailerInfo.Info,
  ID: context.trailerInfo.ID,
  Prev: Number(startxref[1]),
});
chunks.push(Buffer.from(`${xref}trailer\n${trailer.toString()}\nstartxref\n${xrefOffset}\n%%EOF\n`, 'latin1'));
const corrected = Buffer.concat(chunks);
if (!corrected.subarray(0, original.length).equals(original)) throw new Error('Original bytes changed');
const check = await PDFDocument.load(corrected, { updateMetadata: false });
for (const link of auditLinks) {
  const annots = check.getPage(link.page - 1).node.lookup(PDFName.of('Annots'), PDFArray);
  const annotation = check.context.lookup(annots.get(annots.size() - 1));
  const uri = annotation.lookup(PDFName.of('A')).lookup(PDFName.of('URI')).decodeText();
  if (uri !== link.url) throw new Error(`Wrong link on page ${link.page}`);
  if (annots.size() !== link.preservedAnnotations + 1) throw new Error('Existing annotations changed');
}
writeFileSync(out, corrected);
if (hash(readFileSync(source)) !== originalHash) throw new Error('Source changed');
writeFileSync(new URL('link-audit.json', import.meta.url), JSON.stringify({
  source, output: out, pageCount: check.getPageCount(),
  originalSha256: originalHash, correctedSha256: hash(corrected),
  originalBytesPreserved: true, addedBytes: corrected.length - original.length,
  links: auditLinks,
}, null, 2));
console.log(`PASS: all 10 links verified, original PDF preserved byte-for-byte as prefix; ${corrected.length - original.length} bytes appended.`);
console.log(out);