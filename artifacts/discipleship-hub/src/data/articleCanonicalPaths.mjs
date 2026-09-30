/**
 * User-approved exact article retirements (FIRST column survives for the
 * original 59 matching pairs; the six differing Majesty pairs retain the
 * current local Attributes of God versions after separate editorial approval).
 * This is an exact manifest, NOT a topic/prefix redirect. Topic pages, sources,
 * media and PDFs stay intact.
 */
const pairs = [
  ["church/struggle-inner-peace", "growth/inner-peace", [
    "after-discoverywhat", "behaviors-that-stand-in-the-way-of-your-peace",
    "embracing-the-truth", "help-for-a-hard-journey", "lifes-many-stresses",
    "mind-and-body", "self-discovery", "the-impact-of-our-emotions",
    "there-is-hope", "the-responsibility-is-yours",
  ]],
  ["church/from-coping-to-cure", "growth/from-cope-cure", [
    "anger-is-one-letter-away-from-danger",
    "anyone-who-talks-about-rejoicing-always-just-doesnt-understand-the-real-situation",
    "at-what-age-is-it-acceptable-to-sulk-when-you-cant-have-what-you-want",
    "boom-the-wing-of-the-plane-smacked-me-in-the-head",
    "gods-sharpest-tools-my-biggest-problems",
    "how-can-i-find-peace-and-satisfaction-in-this-world",
    "if-you-dont-want-to-you-arent-going-to", "i-need-to-forgive-those-soldiers",
    "i-prayed-but-i-still-didnt-feel-right", "living-and-dying",
    "look-do-you-want-me-to-drive-this-car-or-do-you-want-to-do-it",
    "most-of-us-have-had-a-poor-start-in-life",
    "sin-has-not-been-eliminated-as-of-the-date-of-publication-of-this-course",
    "the-foundation", "the-myth-of-complexity",
    "why-dont-you-just-concentrate-on-the-positive",
    "why-is-it-difficult-to-walk-by-a-mirror-without-looking-at-yourself",
    "your-wife-has-inoperable-cancer",
  ]],
  ["church/soul-prescription", "growth/5-steps-break-destructive-behavior", [
    "defending-your-ground-step-4-defend-against-spiritual-attacks",
    "embracing-truth-step-2-revise-your-false-beliefs",
    "knowing-god-step-1-adopt-a-correct-view-of-god", "the-heart-of-the-problem",
    "the-secret-to-lasting-health", "turning-around-step-3-repent-of-your-sin",
    "your-sin-diagnosis",
  ]],
  ["growth/bb-becoming-new-you", "growth/identity-in-christ", [
    "choosing-wisely-with-your-new-identity", "embracing-your-new-identity-in-christ",
    "identity-based-spiritual-warfare", "living-out-your-new-identity-daily",
    "living-supernaturally-in-your-new-identity", "walking-in-your-new-identity",
    "what-the-bible-says-about-the-new-you", "you-are-a-child-of-god",
    "you-are-a-citizen-of-gods-kingdom", "you-are-a-member-of-the-body-of-christ",
    "you-are-a-saint-with-a-new-nature",
  ]],
  ["growth/bb-growing-closer-habits", "growth/seven-habits", [
    "duty-discipline-delight", "habit-1-desire-god", "habit-2-pursue-god",
    "habit-3-know-god", "habit-4-love-god", "habit-5-fear-god",
    "habit-6-trust-god", "habit-7-enjoy-god",
  ]],
  ["growth/forever-loved", "growth/forever-loved-fathers-love", [
    "loving-the-rebellious", "loving-the-self-righteous", "loving-with-perfection",
    "parable-of-the-lost-son", "suggestions-for-study",
  ]],
  ["growth/bb-growing-closer-majesty", "growth/attributes-of-god", [
    "attributes-of-holiness", "attributes-of-love",
    "attributes-of-self-existence", "attributes-of-sovereignty",
    "live-in-the-light-of-his-majesty", "the-supreme-pursuit-of-the-heart",
  ]],
];

export const ARTICLE_REDIRECTS = Object.freeze(Object.fromEntries(
  pairs.flatMap(([from, to, slugs]) => slugs.map(slug => [
    `/categories/${from}/${slug}`, `/categories/${to}/${slug}`,
  ])),
));

/** Exact lookup; queries/fragments are preserved, and slash variants converge. */
export function canonicalArticlePath(path) {
  const match = path.match(/^([^?#]*)([\s\S]*)$/);
  const target = ARTICLE_REDIRECTS[match[1].replace(/\/+$/, "")];
  return target ? target + match[2] : path;
}

export function isRetiredArticlePath(path) {
  return canonicalArticlePath(path) !== path;
}

/** Raw dev HTTP request URL: Astro strips queries when serving static routes. */
export function articleRedirectLocation(requestUrl, base = "/") {
  const url = new URL(requestUrl, "http://localhost");
  const prefix = base.replace(/\/+$/, "");
  const path = prefix && url.pathname.startsWith(prefix + "/")
    ? url.pathname.slice(prefix.length) : url.pathname;
  const survivor = canonicalArticlePath(path.replace(/^\/channels(?=\/|$)/, "/categories"));
  return survivor !== path ? prefix + survivor + url.search : undefined;
}

/** Resolve browser-relative and absolute first-party links without touching assets. */
export function canonicalArticleHref(href, pagePath = "/", base = "/") {
  let url;
  try { url = new URL(href, `https://equip.jesusonline.com${pagePath}`); }
  catch { return href; }
  if (url.origin !== "https://equip.jesusonline.com") return href;
  const prefix = base.replace(/\/+$/, "");
  const path = prefix && url.pathname.startsWith(prefix + "/")
    ? url.pathname.slice(prefix.length) : url.pathname;
  const target = ARTICLE_REDIRECTS[path.replace(/\/+$/, "")];
  if (!target) return href;
  if (/^(?:https?:)?\/\//i.test(href)) {
    url.pathname = (prefix && url.pathname.startsWith(prefix + "/") ? prefix : "") + target;
    return url.href;
  }
  return prefix + target + url.search + url.hash;
}

/** Recursively canonicalize generated link fields and embedded HTML path strings. */
export function canonicalizeArticleLinks(value) {
  if (typeof value === "string") {
    return value.replace(/(?:(?:https?:)?\/\/[^\s"'<>\\/]+)?\/categories\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/?(?![A-Za-z0-9_/-])/g,
      path => /^(?:https?:)?\/\//i.test(path) ? canonicalArticleHref(path) : canonicalArticlePath(path));
  }
  if (Array.isArray(value)) return value.map(canonicalizeArticleLinks);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, canonicalizeArticleLinks(entry)]));
  }
  return value;
}