/**
 * Verified direct destinations for JO EQUIP article pages.
 *
 * An article can be linked only when its source provides an app post slug or
 * the matching sub-topic item explicitly provides a direct JO App post URL.
 * Do not derive destinations from titles or local article IDs.
 */

const APP_ORIGIN = "https://app.jesusonline.com";
/* Source catalog slugs are case-sensitive and a small number legitimately
   contain doubled hyphens or ampersands. Keep the source value exact while
   excluding path separators, whitespace, query strings, and fragments. */
const APP_POST_SLUG = /^[A-Za-z0-9]+(?:[A-Za-z0-9&-]*[A-Za-z0-9])?$/;

function fromSourceSlug(appSlug?: string): string | undefined {
  return appSlug && APP_POST_SLUG.test(appSlug)
    ? `${APP_ORIGIN}/post/${appSlug}`
    : undefined;
}

function fromExplicitUrl(appUrl?: string): string | undefined {
  if (!appUrl) return undefined;

  try {
    const parsed = new URL(appUrl);
    const match = parsed.pathname.match(/^\/post\/([^/]+)\/?$/);
    if (
      parsed.origin !== APP_ORIGIN ||
      parsed.search ||
      parsed.hash ||
      !match ||
      !APP_POST_SLUG.test(match[1])
    ) {
      return undefined;
    }
    return `${APP_ORIGIN}/post/${match[1]}`;
  } catch {
    return undefined;
  }
}

/**
 * Returns one canonical, verified JO App article URL, if the article has one.
 * A source post slug is preferred because it is the article's direct source;
 * an explicit matching item URL is a safe fallback for authored content.
 */
export function getVerifiedJoAppArticleUrl({
  sourceAppSlug,
  explicitAppUrl,
}: {
  sourceAppSlug?: string;
  explicitAppUrl?: string;
}): string | undefined {
  return fromSourceSlug(sourceAppSlug) ?? fromExplicitUrl(explicitAppUrl);
}