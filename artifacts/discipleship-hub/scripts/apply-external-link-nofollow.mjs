#!/usr/bin/env node
/**
 * Apply and validate the JO EQUIP external-link nofollow policy against every
 * generated HTML file. Runs after `astro build` and before sitemap hashing.
 */
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { relative, resolve, join } from "node:path";
import {
  APPROVED_FIRST_PARTY_HOSTNAMES,
  collectAnchors,
  transformExternalAnchorNofollow,
} from "./external-link-policy.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const DIST = resolve(ROOT, "dist");
const REPORT_PATH = resolve(DIST, "nofollow-report.json");

function* htmlFiles(dir) {
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* htmlFiles(full);
    else if (name.endsWith(".html")) yield full;
  }
}

function tokenKeys(tokens) {
  return new Set(tokens.map(token => token.toLowerCase()));
}

function hasToken(tokens, token) {
  const wanted = token.toLowerCase();
  return tokens.some(value => value.toLowerCase() === wanted);
}

function pushExample(list, value, limit = 12) {
  if (value && list.length < limit && !list.includes(value)) list.push(value);
}

if (!existsSync(DIST)) {
  console.error("nofollow: dist directory not found; run Astro build first");
  process.exit(1);
}

const report = {
  approvedFirstPartyHostnames: [...APPROVED_FIRST_PARTY_HOSTNAMES],
  htmlFilesScanned: 0,
  totalAnchors: 0,
  anchorsWithHref: 0,
  internalLinks: 0,
  externalHttpLinks: 0,
  externalLinksWithNofollow: 0,
  externalLinksMissingNofollow: 0,
  specialSchemeLinks: 0,
  invalidLinks: 0,
  anchorsWithoutHref: 0,
  internalLinksWithPreexistingNofollow: 0,
  internalLinksIncorrectlyGivenNofollow: 0,
  duplicateNofollowTokens: 0,
  multipleRelAttributes: 0,
  linkDestinationsChanged: 0,
  existingRelValuesLost: 0,
  unexpectedRelValuesAdded: 0,
  modifiedAnchors: 0,
  nofollowTokensAdded: 0,
  duplicateNofollowTokensRemoved: 0,
  examples: {
    external: [],
    internalAbsolute: [],
    internalRelative: [],
    specialScheme: [],
    failures: [],
  },
};

for (const file of htmlFiles(DIST)) {
  report.htmlFilesScanned++;
  const beforeHtml = readFileSync(file, "utf8");
  const beforeAnchors = collectAnchors(beforeHtml);
  const transformed = transformExternalAnchorNofollow(beforeHtml);
  const afterHtml = transformed.html;
  const afterAnchors = collectAnchors(afterHtml);
  const filePath = relative(DIST, file);

  report.modifiedAnchors += transformed.stats.modifiedAnchors;
  report.nofollowTokensAdded += transformed.stats.nofollowTokensAdded;
  report.duplicateNofollowTokensRemoved += transformed.stats.duplicateNofollowTokensRemoved;

  if (afterHtml !== beforeHtml) writeFileSync(file, afterHtml);

  if (beforeAnchors.length !== afterAnchors.length) {
    report.examples.failures.push(`${filePath}: anchor count changed during transform`);
    continue;
  }

  for (let index = 0; index < afterAnchors.length; index++) {
    const before = beforeAnchors[index];
    const after = afterAnchors[index];
    const href = after.href;
    const location = `${filePath} anchor ${index + 1}`;

    report.totalAnchors++;
    if (after.hrefAttribute) report.anchorsWithHref++;
    else report.anchorsWithoutHref++;

    if (before.href !== after.href) {
      report.linkDestinationsChanged++;
      pushExample(report.examples.failures, `${location}: href changed`);
    }

    const beforeRel = tokenKeys(before.relTokens);
    const afterRel = tokenKeys(after.relTokens);
    for (const token of beforeRel) {
      if (!afterRel.has(token)) {
        report.existingRelValuesLost++;
        pushExample(report.examples.failures, `${location}: existing rel token "${token}" was lost`);
      }
    }
    for (const token of afterRel) {
      if (!beforeRel.has(token) && !(after.classification.kind === "external" && token === "nofollow")) {
        report.unexpectedRelValuesAdded++;
        pushExample(report.examples.failures, `${location}: unexpected rel token "${token}" was added`);
      }
    }

    if (after.relAttributes.length > 1) {
      report.multipleRelAttributes++;
      pushExample(report.examples.failures, `${location}: multiple rel attributes`);
    }
    if (after.nofollowCount > 1) {
      report.duplicateNofollowTokens += after.nofollowCount - 1;
      pushExample(report.examples.failures, `${location}: duplicate nofollow tokens`);
    }

    switch (after.classification.kind) {
      case "external":
        report.externalHttpLinks++;
        pushExample(report.examples.external, href);
        if (after.nofollowCount === 1) report.externalLinksWithNofollow++;
        else {
          report.externalLinksMissingNofollow++;
          pushExample(report.examples.failures, `${location}: external link missing exactly one nofollow (${href})`);
        }
        break;
      case "internal":
        report.internalLinks++;
        if (/^https?:\/\//i.test(href ?? "") || (href ?? "").startsWith("//")) {
          pushExample(report.examples.internalAbsolute, href);
        } else {
          pushExample(report.examples.internalRelative, href);
        }
        if (hasToken(before.relTokens, "nofollow")) report.internalLinksWithPreexistingNofollow++;
        if (!hasToken(before.relTokens, "nofollow") && hasToken(after.relTokens, "nofollow")) {
          report.internalLinksIncorrectlyGivenNofollow++;
          pushExample(report.examples.failures, `${location}: internal link was given nofollow (${href})`);
        }
        break;
      case "special":
        report.specialSchemeLinks++;
        pushExample(report.examples.specialScheme, href);
        break;
      case "invalid":
        report.invalidLinks++;
        pushExample(report.examples.failures, `${location}: href could not be parsed (${href})`);
        break;
      case "missing":
        break;
    }
  }

  const secondPass = transformExternalAnchorNofollow(afterHtml);
  if (secondPass.html !== afterHtml) {
    pushExample(report.examples.failures, `${filePath}: transform is not idempotent`);
  }
}

writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + "\n");

console.log(
  `nofollow: files=${report.htmlFilesScanned} anchors=${report.totalAnchors} ` +
  `internal=${report.internalLinks} external=${report.externalHttpLinks} ` +
  `externalWithNofollow=${report.externalLinksWithNofollow} modified=${report.modifiedAnchors}`,
);

const failureCount =
  report.externalLinksMissingNofollow +
  report.internalLinksIncorrectlyGivenNofollow +
  report.duplicateNofollowTokens +
  report.multipleRelAttributes +
  report.linkDestinationsChanged +
  report.existingRelValuesLost +
  report.unexpectedRelValuesAdded +
  report.invalidLinks +
  report.examples.failures.filter(message => message.includes("not idempotent") || message.includes("anchor count changed")).length;

if (failureCount > 0) {
  console.error(`nofollow: validation failed with ${failureCount} issue(s); see ${relative(ROOT, REPORT_PATH)}`);
  for (const failure of report.examples.failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`nofollow: validation passed; report written to ${relative(ROOT, REPORT_PATH)}`);