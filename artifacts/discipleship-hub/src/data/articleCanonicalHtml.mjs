import { decodeHTMLAttribute, escapeAttribute } from "entities";
import { canonicalArticleHref, canonicalizeArticleLinks } from "./articleCanonicalPaths.mjs";

/** Runs while prerendering (before Pagefind), and on dev responses. */
export function canonicalArticleHtml(html, pagePath = "/", base = "/") {
  const normalized = html.replace(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi,
    (attribute, double, single, bare) => {
      const original = double ?? single ?? bare;
      const decoded = decodeHTMLAttribute(original);
      const target = canonicalArticleHref(decoded, pagePath, base);
      return target === decoded ? attribute : `href="${escapeAttribute(target)}"`;
    });
  // Structured-data URLs are not HTML attributes. Don't rewrite visible text,
  // unrelated external destinations, scripts, or media paths.
  return normalized.replace(/(<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script>)/gi,
    (_match, open, data, close) => open + canonicalizeArticleLinks(data) + close);
}