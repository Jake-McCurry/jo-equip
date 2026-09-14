import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(resolve(root, 'scripts/package.json'));
const { PDFDocument, PDFName, PDFArray, PDFString, StandardFonts, rgb, decodePDFRawStream } = require('pdf-lib');
const audit = JSON.parse(readFileSync(new URL('link-audit.json', import.meta.url)));
const source = resolve(root, 'attached_assets/The_Adventure_of_Living_with_Jesus_(The_Guide_edition)_v.09122_1789423098075.pdf');
const doc = await PDFDocument.load(readFileSync(source), { updateMetadata: false });
const font = await doc.embedFont(StandardFonts.Helvetica);
const n = '(-?\\d+(?:\\.\\d+)?)';
const panelPattern = new RegExp(`0\\.1058824\\s+0\\.3098039\\s+0\\.4470588\\s+sc\\s+${n}\\s+${n}\\s+m\\s+${n}\\s+${n}\\s+l\\s+${n}\\s+${n}\\s+l\\s+${n}\\s+${n}\\s+l\\s+h\\s+f`, 'g');
const changes = [];
for (const link of audit.links) {
  const page = doc.getPage(link.page - 1);
  const rawContents = page.node.get(PDFName.of('Contents'));
  const contents = doc.context.lookup(rawContents);
  const refs = contents instanceof PDFArray ? contents.asArray() : [rawContents];
  let removed = 0;
  let baseline;
  const panels = [];
  for (const ref of refs) {
    const original = Buffer.from(decodePDFRawStream(doc.context.lookup(ref)).decode()).toString('latin1');
    for (const m of original.matchAll(panelPattern)) {
      const [x, top, right, top2, right2, bottom, x2, bottom2] = m.slice(1).map(Number);
      if (x !== x2 || right !== right2 || top !== top2 || bottom !== bottom2) continue;
      if (x <= link.rect[0] + 2 && right >= link.rect[2] - 2 && bottom <= link.rect[1] && top >= link.rect[3]) {
        panels.push([x, bottom, right, top]);
      }
    }
    const edited = original.replace(/q\s+0\.24\s+0\s+0\s+0\.24\s+0\s+(-?[\d.]+)\s+cm\s+BT([\s\S]*?)ET\s+Q/g, (block, originY, text) => {
      const tm = text.match(/[-\d.]+\s+[-\d.]+\s+[-\d.]+\s+[-\d.]+\s+(-?[\d.]+)\s+(-?[\d.]+)\s+Tm/);
      if (!tm) return block;
      const x = Number(tm[1]) * .24;
      const y = Number(originY) + Number(tm[2]) * .24;
      if (x < link.rect[0] || x > link.rect[2] || y < link.rect[1] || y > link.rect[3]) return block;
      removed++;
      baseline = y;
      return ''; // Remove the old URL drawing operators, not just cover them.
    });
    if (edited !== original) {
      doc.context.assign(ref, doc.context.flateStream(Buffer.from(edited, 'latin1')));
    }
  }
  if (!removed || baseline === undefined || !panels.length) throw new Error(`Unmatched URL/panel on page ${link.page}`);
  const panel = panels.sort((a,b) => (b[2]-b[0])*(b[3]-b[1])-(a[2]-a[0])*(a[3]-a[1]))[0];
  const prefix = 'https://follow.jesusonline.com/deeper/';
  const slug = link.url.slice(prefix.length);
  const x = link.rect[0] + 2;
  const size = 7.5;
  if (Math.max(font.widthOfTextAtSize(prefix,size),font.widthOfTextAtSize(slug,size)) > panel[2]-x-7) throw new Error('URL too wide');
  for (const [i,text] of [prefix,slug].entries()) {
    page.drawText(text,{x,y:baseline+2-i*8.5,size,font,color:rgb(.9568627,.8509804,.7764706)});
  }
  if (baseline-8 < panel[1]) throw new Error('URL exceeds panel bottom');
  const annotation = doc.context.register(doc.context.obj({
    Type:'Annot', Subtype:'Link', Rect:panel, Border:[0,0,0], H:'N',
    A:{Type:'Action',S:'URI',URI:PDFString.of(link.url)},
  }));
  page.node.addAnnot(annotation);
  changes.push({...link,panel,removedTextBlocks:removed,changedArea:[x-2,baseline-10,panel[2]-2,baseline+11]});
}
const output = fileURLToPath(new URL('Adventure-Guide-Updated-Visible-Links.pdf', import.meta.url));
writeFileSync(output,await doc.save({useObjectStreams:false}));
writeFileSync(new URL('visible-link-audit.json', import.meta.url),JSON.stringify({output,changes},null,2));
console.log(`Wrote ${output}; all ${changes.length} old URL text areas removed and replaced; full CTA panels linked.`);