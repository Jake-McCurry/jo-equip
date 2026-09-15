import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import sharp from "sharp";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");
const coverDir = new URL("src/assets/books/covers/", root);

async function readCategories() {
  const source = await read("src/data/bookCategories.ts");
  const categories = [...source.matchAll(/title:\s*"([^"]+)",\s*books:\s*\[([\s\S]*?)\]/g)]
    .map(([, title, ids]) => ({
      title,
      ids: [...ids.matchAll(/"([^"]+)"/g)].map(([, id]) => id),
    }));
  assert.ok(categories.length > 0, "Could not read book categories; update the validator if the catalog format changes.");
  return categories;
}

test("all carousel books have exactly one readable cover that supports the canonical thumbnail size", async () => {
  const files = (await readdir(coverDir)).filter(name => /\.(png|jpg)$/.test(name));
  const categories = await readCategories();
  const ids = categories.flatMap(category => category.ids);
  assert.equal(ids.length, new Set(ids).size, "Books must not appear twice in library categories.");
  for (const id of ids) {
    const matches = files.filter(file => file.replace(/\.(png|jpg)$/, "") === id);
    assert.equal(matches.length, 1, `${id}: expected one source cover, found ${matches.length}.`);
    const source = new URL(matches[0], coverDir);
    const metadata = await sharp(source.pathname).metadata();
    assert.ok(metadata.width >= 96 && metadata.height >= 128, `${id}: cover is too small for a readable thumbnail.`);
    // Astro's image service uses Sharp with these same explicit dimensions/fit.
    // Validate the whole catalog, including legacy and manually chosen covers.
    const { info } = await sharp(source.pathname)
      .resize(360, 480, { fit: "fill" })
      .webp({ quality: 85 })
      .toBuffer({ resolveWithObject: true });
    assert.equal(info.width, 360, `${id}: incorrect thumbnail width.`);
    assert.equal(info.height, 480, `${id}: incorrect thumbnail height.`);
  }
});

test("the shared thumbnail component fixes both dimensions without cropping cover text", async () => {
  const source = await read("src/components/BookThumbnail.astro");
  assert.match(source, /width=\{360\}/);
  assert.match(source, /height=\{480\}/);
  assert.match(source, /fit="fill"/);
  assert.match(source, /aspect-ratio:\s*3\s*\/\s*4/);
  assert.match(source, /\.book-thumbnail img\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%;[^}]*object-fit:\s*fill;/s);
  assert.match(source, /alt=\{`\$\{title\} book cover`\}/);
  const carousel = await read("src/components/BooksCarousel.astro");
  assert.match(carousel, /<BookThumbnail cover=\{cover\} title=\{book\.title\}/);
  assert.doesNotMatch(carousel, /<Image\b|<img\b/);
  assert.doesNotMatch(carousel, /object-contain|object-fit:\s*contain|max-h-\[/);
  assert.match(carousel, /\.book-thumbnail-link\s*\{[^}]*width:\s*100%;[^}]*max-width:\s*180px;/s);
});

test("carousel spacing has a single owner rather than stacked margins and gaps", async () => {
  const carousel = await read("src/components/BooksCarousel.astro");
  const sectionClass = carousel.match(/class="(book-carousel-section[^"]*)"/)?.[1];
  assert.ok(sectionClass, "Missing book carousel section.");
  assert.doesNotMatch(sectionClass, /(?:^|\s)(?:md:)?mb-/);
  assert.match(carousel, /class="carousel-track[^"]*\bpb-2\b/);
  const page = await read("src/pages/books.astro");
  assert.match(page, /class="book-carousel-stack flex flex-col gap-4 md:gap-5"/);
});

test("Devotional Studies lists Knowing God immediately before Hearing the Voice of God", async () => {
  const categories = await readCategories();
  const devotional = categories.find(category => category.title === "Devotional Studies");
  assert.ok(devotional, "Devotional Studies category is missing.");
  assert.deepEqual(devotional.ids.slice(0, 4), [
    "new-life-in-christ",
    "knowing-god",
    "hearing-the-voice-of-god",
    "the-abiding-room",
  ]);
});

test("book titles are centered native PDF links with a trailing download icon", async () => {
  const carousel = await read("src/components/BooksCarousel.astro");
  const link = carousel.match(/<a\s+class="book-title-link[\s\S]*?<\/a>/)?.[0];
  assert.ok(link, "Missing shared book title link.");
  assert.match(link, /href=\{join\(book\.pdf\)\}/);
  assert.match(link, /target="_blank"/);
  assert.match(link, /rel="noopener noreferrer"/);
  assert.match(link, /data-pdf-action="open"/);
  assert.match(link, /justify-center/);
  assert.match(link, /\{cardTitle\}<\/span>\s*<Download/);
  assert.doesNotMatch(link, /\sdownload(?:\s|=|>)/);
  assert.doesNotMatch(carousel, /book-download-btn|<BookOpen\b|data-pdf-action="download"/);
  const page = await read("src/pages/books.astro");
  assert.doesNotMatch(page, /book-download-btn/);
  assert.match(page, /requestBook\(catalogBook\.pdf, catalogBook\.title, true\)/);
});

test("only Knowing God has a concordance title and digital-version destination", async () => {
  const carousel = await read("src/components/BooksCarousel.astro");
  assert.match(carousel, /const isConcordance = book\.id === "knowing-god"/);
  assert.match(carousel, /const cardTitle = isConcordance \? "Knowing God \/ Concordance" : book\.title/);
  assert.match(carousel, /const detailsHref = isConcordance \? "\/knowing-god" : `\/books\/\$\{book\.id\}`/);
  assert.match(carousel, /const detailsLabel = isConcordance \? "View Digital Version" : "Details"/);
  assert.match(carousel, /href=\{join\(detailsHref\)\}/);
  assert.match(carousel, /\{detailsLabel\}/);
});