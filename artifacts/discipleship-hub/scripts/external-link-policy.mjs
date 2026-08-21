import { decodeHTMLAttribute, escapeAttribute } from "entities";

/**
 * Site-wide hyperlink policy for JO EQUIP rendered HTML.
 *
 * This module deliberately operates on final HTML rather than source templates
 * so Astro components and author-controlled `set:html` article blocks follow
 * the same rule. Only <a href> elements are inspected; canonical, asset,
 * iframe, script, form, and structured-data URLs are outside its scope.
 */

export const SITE_URL = "https://equip.jesusonline.com";

/**
 * Evidence-backed first-party websites approved by the project plan.
 * Hostnames are exact: arbitrary subdomains and lookalike domains are external.
 */
export const APPROVED_FIRST_PARTY_HOSTNAMES = Object.freeze([
  "equip.jesusonline.com",
  "app.jesusonline.com",
  "jesusonline.com",
  "jesusonlineministries.org",
]);

const approvedHostnames = new Set(APPROVED_FIRST_PARTY_HOSTNAMES);
const RAW_TEXT_ELEMENTS = new Set([
  "iframe",
  "noembed",
  "noframes",
  "plaintext",
  "script",
  "style",
  "textarea",
  "title",
  "xmp",
]);
const HTML_SPACE = /[\t\n\f\r ]/;

function isHtmlSpace(character) {
  return character !== undefined && HTML_SPACE.test(character);
}

export function normalizeHostname(hostname) {
  return hostname.toLowerCase().replace(/\.+$/, "");
}

/**
 * Classify an anchor href using URL parsing and exact normalized hostnames.
 * Relative/query/fragment URLs resolve against SITE_URL and remain internal.
 */
export function classifyHref(rawHref) {
  if (typeof rawHref !== "string") return { kind: "missing" };

  const href = decodeHTMLAttribute(rawHref);
  let parsed;
  try {
    parsed = new URL(href || SITE_URL, `${SITE_URL}/`);
  } catch {
    return { kind: "invalid" };
  }

  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== "http:" && protocol !== "https:") {
    return { kind: "special", protocol };
  }

  const hostname = normalizeHostname(parsed.hostname);
  return approvedHostnames.has(hostname)
    ? { kind: "internal", protocol, hostname }
    : { kind: "external", protocol, hostname };
}

function findTagEnd(html, start) {
  let quote = null;
  for (let i = start; i < html.length; i++) {
    const char = html[i];
    if (quote) {
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === ">") {
      return i;
    }
  }
  return -1;
}

function parseAttributes(tag) {
  const attributes = [];
  let i = 1;

  while (i < tag.length && !isHtmlSpace(tag[i]) && tag[i] !== "/" && tag[i] !== ">") i++;

  while (i < tag.length) {
    while (i < tag.length && isHtmlSpace(tag[i])) i++;
    if (i >= tag.length || tag[i] === ">" || tag[i] === "/") break;

    const nameStart = i;
    while (
      i < tag.length &&
      !isHtmlSpace(tag[i]) &&
      tag[i] !== "=" &&
      tag[i] !== "/" &&
      tag[i] !== ">"
    ) i++;
    const nameEnd = i;
    if (nameEnd === nameStart) {
      i++;
      continue;
    }

    while (i < tag.length && isHtmlSpace(tag[i])) i++;
    let value = null;
    let valueStart = null;
    let valueEnd = null;
    let quote = null;

    if (tag[i] === "=") {
      i++;
      while (i < tag.length && isHtmlSpace(tag[i])) i++;
      if (tag[i] === '"' || tag[i] === "'") {
        quote = tag[i++];
        valueStart = i;
        while (i < tag.length && tag[i] !== quote) i++;
        valueEnd = i;
        value = tag.slice(valueStart, valueEnd);
        if (tag[i] === quote) i++;
      } else {
        valueStart = i;
        while (i < tag.length && !isHtmlSpace(tag[i]) && tag[i] !== ">") i++;
        valueEnd = i;
        value = tag.slice(valueStart, valueEnd);
      }
    }

    const name = tag.slice(nameStart, nameEnd);
    attributes.push({
      name,
      lowerName: name.toLowerCase(),
      nameEnd,
      value,
      valueStart,
      valueEnd,
      quote,
    });
  }

  return attributes;
}

function findRawTextClose(html, lowerHtml, tagName, from) {
  const needle = `</${tagName}`;
  let cursor = from;
  while (cursor < html.length) {
    const start = lowerHtml.indexOf(needle, cursor);
    if (start === -1) return -1;
    const boundary = html[start + needle.length];
    if (boundary === undefined || isHtmlSpace(boundary) || boundary === "/" || boundary === ">") {
      return start;
    }
    cursor = start + needle.length;
  }
  return -1;
}

/**
 * Locate real anchor start tags while skipping comments and raw-text element
 * contents, so strings inside scripts/styles are never rewritten.
 */
function findAnchorTags(html) {
  const anchors = [];
  const lowerHtml = html.toLowerCase();
  let cursor = 0;

  while (cursor < html.length) {
    const start = html.indexOf("<", cursor);
    if (start === -1) break;

    if (html.startsWith("<!--", start)) {
      const standardEnd = html.indexOf("-->", start + 4);
      const alternateEnd = html.indexOf("--!>", start + 4);
      const endings = [standardEnd, alternateEnd].filter(index => index !== -1);
      const commentEnd = endings.length === 0 ? -1 : Math.min(...endings);
      const endingLength = commentEnd === alternateEnd ? 4 : 3;
      cursor = commentEnd === -1 ? html.length : commentEnd + endingLength;
      continue;
    }

    if (html.startsWith("<!", start) || html.startsWith("<?", start)) {
      const declarationEnd = findTagEnd(html, start + 2);
      cursor = declarationEnd === -1 ? html.length : declarationEnd + 1;
      continue;
    }

    let nameStart = start + 1;
    const closing = html[nameStart] === "/";
    if (closing) nameStart++;
    const nameMatch = html.slice(nameStart).match(/^[A-Za-z][A-Za-z0-9:-]*/);
    if (!nameMatch) {
      cursor = start + 1;
      continue;
    }

    const tagName = nameMatch[0].toLowerCase();
    const end = findTagEnd(html, nameStart + nameMatch[0].length);
    if (end === -1) break;

    if (!closing && tagName === "a") {
      const tag = html.slice(start, end + 1);
      anchors.push({ start, end, tag, attributes: parseAttributes(tag) });
    }

    if (!closing && tagName === "plaintext") {
      break;
    } else if (!closing && RAW_TEXT_ELEMENTS.has(tagName)) {
      const closeStart = findRawTextClose(html, lowerHtml, tagName, end + 1);
      if (closeStart === -1) break;
      const closeEnd = findTagEnd(html, closeStart + tagName.length + 2);
      cursor = closeEnd === -1 ? html.length : closeEnd + 1;
    } else {
      cursor = end + 1;
    }
  }

  return anchors;
}

export function relTokens(value) {
  return typeof value === "string"
    ? decodeHTMLAttribute(value).split(/[\t\n\f\r ]+/).filter(Boolean)
    : [];
}

function anchorRecord(anchor) {
  const hrefAttribute = anchor.attributes.find(attribute => attribute.lowerName === "href");
  const relAttributes = anchor.attributes.filter(attribute => attribute.lowerName === "rel");
  const tokens = relAttributes.flatMap(attribute => relTokens(attribute.value));
  return {
    ...anchor,
    hrefAttribute,
    relAttributes,
    href: hrefAttribute?.value ?? null,
    classification: classifyHref(hrefAttribute?.value),
    relTokens: tokens,
    nofollowCount: tokens.filter(token => token.toLowerCase() === "nofollow").length,
  };
}

export function collectAnchors(html) {
  return findAnchorTags(html).map(anchorRecord);
}

function setAttributeValue(tag, attribute, value) {
  const serialized = `"${escapeAttribute(value)}"`;
  if (attribute.valueStart !== null && attribute.valueEnd !== null) {
    if (attribute.quote) {
      const quoteStart = attribute.valueStart - 1;
      const quoteEnd = tag[attribute.valueEnd] === attribute.quote
        ? attribute.valueEnd + 1
        : attribute.valueEnd;
      return tag.slice(0, quoteStart) + serialized + tag.slice(quoteEnd);
    }
    return tag.slice(0, attribute.valueStart) + serialized + tag.slice(attribute.valueEnd);
  }
  return tag.slice(0, attribute.nameEnd) + `=${serialized}` + tag.slice(attribute.nameEnd);
}

function addAttribute(tag, name, value) {
  const close = tag.lastIndexOf(">");
  let insertionPoint = close;
  let beforeClose = close - 1;
  while (beforeClose >= 0 && isHtmlSpace(tag[beforeClose])) beforeClose--;
  if (tag[beforeClose] === "/") insertionPoint = beforeClose;
  return tag.slice(0, insertionPoint) +
    ` ${name}="${escapeAttribute(value)}"` +
    tag.slice(insertionPoint);
}

function externalRelValue(tokens) {
  const result = [];
  let sawNofollow = false;
  for (const token of tokens) {
    if (token.toLowerCase() === "nofollow") {
      if (sawNofollow) continue;
      sawNofollow = true;
    }
    result.push(token);
  }
  if (!sawNofollow) result.push("nofollow");
  return result.join(" ");
}

/**
 * Add exactly one nofollow token to external HTTP(S) anchors.
 * Internal and special-scheme anchors are returned byte-for-byte unchanged.
 */
export function transformExternalAnchorNofollow(html) {
  const anchors = collectAnchors(html);
  let output = "";
  let cursor = 0;
  let modifiedAnchors = 0;
  let nofollowTokensAdded = 0;
  let duplicateNofollowTokensRemoved = 0;

  for (const anchor of anchors) {
    if (anchor.classification.kind !== "external") continue;
    if (anchor.relAttributes.length > 1) continue;

    const desiredRel = externalRelValue(anchor.relTokens);
    const existingRel = anchor.relAttributes[0]?.value ?? null;
    const needsChange = existingRel === null
      ? true
      : desiredRel !== anchor.relTokens.join(" ");
    if (!needsChange) continue;

    let transformedTag;
    if (anchor.relAttributes.length === 0) {
      transformedTag = addAttribute(anchor.tag, "rel", desiredRel);
    } else {
      transformedTag = setAttributeValue(anchor.tag, anchor.relAttributes[0], desiredRel);
    }

    output += html.slice(cursor, anchor.start) + transformedTag;
    cursor = anchor.end + 1;
    modifiedAnchors++;
    if (anchor.nofollowCount === 0) nofollowTokensAdded++;
    if (anchor.nofollowCount > 1) duplicateNofollowTokensRemoved += anchor.nofollowCount - 1;
  }

  if (modifiedAnchors === 0) {
    return {
      html,
      stats: { modifiedAnchors, nofollowTokensAdded, duplicateNofollowTokensRemoved },
    };
  }

  output += html.slice(cursor);
  return {
    html: output,
    stats: { modifiedAnchors, nofollowTokensAdded, duplicateNofollowTokensRemoved },
  };
}