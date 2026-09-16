import mammoth from "mammoth";

/**
 * Shared publication-page content for the JO EQUIP books.
 *
 * The permission copy is intentionally kept here, rather than in individual
 * book parsers, so the Walking, Identity, Majesty, and Adventure builders all
 * use the same legal wording and link target.
 */
export const PERMISSION_HEADING = "Permission to reproduce this material";
export const PERMISSION_BODY =
  "The publisher grants permission to reproduce this material without written approval, provided it is used without charge and only for non-profit ministry purposes.";
export const PERMISSION_CONTACT =
  "Please email us and let us know how you are using it in your ministry:";
export const PERMISSION_URL = "https://equip.jesusonline.com/reviews/share";
export const PERMISSION_VISIBLE_URL = "equip.jesusonline.com/reviews/share";

export const ADDITIONAL_RESOURCES_SOURCE =
  "attached_assets/JOM_Additional_Resources_page_1789514210420.docx";

export interface BookPublicationPages {
  permissionHtml: string;
  resourcesHtml: string;
}

export interface PublicationChapter {
  key: string;
  headingHtml: string;
  bodyHtml: string;
}

export interface PublicationTocEntry {
  kind: string;
  labelText?: string;
  key?: string | null;
  [key: string]: unknown;
}

export interface PublicationParsedBook {
  frontPagesHtml: string;
  tocEntries: PublicationTocEntry[];
  chapters: PublicationChapter[];
}

/**
 * This is deliberately a real anchor (rather than a bare URL to be
 * post-processed later), which lets this module be reused by builders whose
 * linkifier differs from the ebook builder.
 */
export function permissionPageHtml(): string {
  return `
<aside class="permission-box" aria-label="${PERMISSION_HEADING}">
  <h2>${PERMISSION_HEADING}</h2>
  <p>${PERMISSION_BODY}</p>
  <p>${PERMISSION_CONTACT}
    <a href="${PERMISSION_URL}">${PERMISSION_VISIBLE_URL}</a>
  </p>
</aside>`;
}

/** Ready-to-use HTML for builders that do not need a per-book wrapper. */
export const PERMISSION_HTML = permissionPageHtml();

/**
 * CSS shared by the publication-page implementations. The title-page rule
 * uses the existing strict front-matter page as its containing page and pushes
 * the permission box to the bottom without changing the manuscript body.
 *
 * Resource images are constrained before print. This is important because an
 * unconstrained DOCX image can make Chromium shrink the entire page instead
 * of only shrinking the image.
 */
export const BOOK_PUBLICATION_PAGES_CSS = `
  .front-matter {
    box-sizing: border-box;
    /*
     * ebookDocxBuild renders Letter pages with 0.8in top and 0.85in bottom
     * print margins. Keep the permission box at the bottom of that full
     * 9.35in printable title-page area, not merely at the bottom of the
     * manuscript's text block.
     */
    min-height: calc(11in - 0.8in - 0.85in);
    display: flex;
    flex-direction: column;
  }
  .front-matter .permission-box {
    flex: 0 0 auto;
    margin-top: auto;
    border: 2px solid #0b3c5d;
    border-radius: 4px;
    background: #f3f8fc;
    color: #1f2937;
    padding: 0.6em 0.8em 0.35em;
    font-size: 10pt;
    line-height: 1.35;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .front-matter .permission-box h2 {
    margin: 0 0 0.35em;
    color: #0b3c5d;
    font-family: Carlito, Calibri, sans-serif;
    font-size: 14pt;
    font-weight: 700;
    line-height: 1.2;
  }
  .front-matter .permission-box p {
    margin: 0 0 0.45em;
  }
  .front-matter .permission-box p:last-child {
    margin-bottom: 0;
  }
  .front-matter .permission-box a,
  .resources-page a {
    color: #0563c1;
    text-decoration: underline;
  }
  .resources-page {
    break-inside: avoid;
    page-break-inside: avoid;
    font-size: 11pt;
    line-height: 1.2;
  }
  .resources-page > h1 {
    margin-top: 0;
    margin-bottom: 0.35em;
  }
  .resources-page h2 {
    margin: 0.35em 0 0.15em;
    font-size: 14pt;
    line-height: 1.15;
  }
  .resources-page h2 + h2 {
    margin-top: 0.2em;
  }
  .resources-page p {
    margin-bottom: 0.35em;
  }
  .resources-page p:has(img) {
    margin: 0.15em 0 0.35em;
    text-align: center;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .resources-page img {
    display: block;
    width: 85%;
    max-width: 100% !important;
    height: auto !important;
    margin: 0 auto;
    break-inside: avoid;
    page-break-inside: avoid;
  }
`;

/** Short shared-module alias for consumers such as Adventure's builder. */
export const PUBLICATION_PAGES_CSS = BOOK_PUBLICATION_PAGES_CSS;

function stripResourceTitle(html: string): string {
  /*
   * The attached page's first paragraph is the page title. The ebook builder
   * renders chapter titles itself, so retaining that paragraph would produce a
   * duplicate title. No body text is rewritten.
   */
  return html.replace(
    /^\s*<p[^>]*>\s*Additional Resources\s*<\/p>\s*/i,
    "",
  );
}

/**
 * Convert the attached Additional Resources page with its original embedded
 * PNGs. Mammoth's data-URL image handler keeps this module self-contained for
 * Chromium's request interception and preserves the source page's image
 * content instead of substituting screenshots or placeholders.
 */
export async function loadAdditionalResourcesPageHtml(
  sourceDocxPath: string,
): Promise<string> {
  const { value, messages } = await mammoth.convertToHtml(
    { path: sourceDocxPath },
    {
      convertImage: mammoth.images.imgElement(async image => {
        const data = await image.read("base64");
        return {
          src: `data:${image.contentType};base64,${data}`,
        };
      }),
    },
  );
  const warnings = messages.filter(
    message =>
      message.type === "warning" &&
      !/Unrecognised (run|paragraph) style/.test(message.message),
  );
  if (warnings.length) {
    throw new Error(
      `Additional Resources conversion warnings: ${warnings
        .map(message => message.message)
        .join("; ")}`,
    );
  }
  if (!/<img\b/i.test(value)) {
    throw new Error("Additional Resources page did not contain embedded images");
  }
  if (!/Share Your Story[\s\S]*equip\.jesusonline\.com\/reviews\/share/i.test(value)) {
    throw new Error(
      "Additional Resources page is missing the source review link text",
    );
  }
  /*
   * The supplied DOCX stores this URL as visible text rather than a Word
   * hyperlink relationship. Activate only that source URL while preserving
   * every visible character of the attached page.
   */
  let html = value.replace(
    /(Share Your Story\s*→\s*)(equip\.jesusonline\.com\/reviews\/share)/i,
    `$1<a href="${PERMISSION_URL}">$2</a>`,
  );
  // The attachment accidentally styles the app description as Heading 2.
  // Keep its exact words, but treat it as prose (as the Majesty parser does).
  html = html.replace(/<h2>([\s\S]*?)<\/h2>/g, (full, content: string) =>
    content.replace(/<[^>]*>/g, "").length > 150 ? `<p>${content}</p>` : full,
  );
  let imageIndex = 0;
  html = html.replace(/<img\b[^>]*>/g, image => {
    const target = ["https://app.jesusonline.com", "https://equip.jesusonline.com"][imageIndex++];
    if (!target) throw new Error("Unexpected Additional Resources image count");
    return `<a href="${target}">${image}</a>`;
  });
  if (imageIndex !== 2) throw new Error("Expected both Additional Resources images");
  return html;
}

/**
 * Return the source page content without its leading title paragraph. Ebook
 * chapter renderers supply that title as their chapter heading; consumers
 * wanting the verbatim full page should use loadAdditionalResourcesPageHtml.
 */
export async function loadAdditionalResourcesHtml(
  sourceDocxPath: string,
): Promise<string> {
  return stripResourceTitle(await loadAdditionalResourcesPageHtml(sourceDocxPath));
}

/**
 * Load all shared publication content. Reading the source here (instead of
 * copying hand-maintained HTML into each book parser) makes a source-page
 * revision repeatable and keeps the embedded images authoritative.
 */
export async function loadBookPublicationPages(
  resourcesDocxPath: string,
): Promise<BookPublicationPages> {
  return {
    permissionHtml: permissionPageHtml(),
    resourcesHtml: await loadAdditionalResourcesHtml(resourcesDocxPath),
  };
}

function removeExistingPermission(frontHtml: string): string {
  /*
   * Majesty's editable manuscript already has an unboxed permission block.
   * Remove only that existing block before adding the canonical shared box.
   * Walking and Identity do not contain this text, so their front matter is
   * otherwise untouched.
   */
  let html = frontHtml.replace(
    /<[^>]+id=["']permission["'][^>]*>[\s\S]*?<\/[^>]+>\s*/i,
    "",
  );
  html = html.replace(
    /<p[^>]*>\s*The publisher grants permission to reproduce this material without written approval, provided it is used without charge and only for non-profit ministry purposes\.\s*<\/p>\s*/i,
    "",
  );
  html = html.replace(
    /<p[^>]*>\s*Please email us and let us know how you are using it in your ministry:\s*(?:<br\s*\/?>\s*)?(?:<a[^>]*>)?equip\.jesusonline\.com\/reviews\/share(?:<\/a>)?\s*<\/p>\s*/i,
    "",
  );
  return html;
}

function isResourcesChapter(chapter: PublicationChapter): boolean {
  const heading = chapter.headingHtml.replace(/<[^>]+>/g, " ");
  return (
    chapter.key === "MORE" ||
    /(?:More Free Resources|Additional Resources)/i.test(heading)
  );
}

/**
 * Apply the shared title-page permission box and exact attached resources
 * page to any parsed book shape. The generic structural type is intentional:
 * Adventure's builder can consume this without importing ebookDocxBuild.
 */
export function applyBookPublicationPages<T extends PublicationParsedBook>(
  parsed: T,
  pages: BookPublicationPages,
): T {
  const front = removeExistingPermission(parsed.frontPagesHtml);
  parsed.frontPagesHtml = front.replace(
    /<\/section>\s*$/i,
    `${pages.permissionHtml}\n</section>`,
  );

  const resources = parsed.chapters.find(isResourcesChapter);
  if (!resources) {
    throw new Error("No Additional Resources chapter found in parsed book");
  }
  const oldKey = resources.key;
  resources.key = "MORE";
  resources.headingHtml = "Additional Resources";
  resources.bodyHtml = pages.resourcesHtml;

  for (const entry of parsed.tocEntries) {
    if (
      entry.kind === "entry" &&
      entry.key === oldKey
    ) {
      entry.key = "MORE";
      entry.labelText = "Additional Resources";
    }
  }
  return parsed;
}
