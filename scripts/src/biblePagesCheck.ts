#!/usr/bin/env node
/**
 * Guardrail check for the Church channel's "Bible Mastery" nested hierarchy.
 *
 * The Church channel was restructured into a deep nested tree that is rendered
 * entirely from data in artifacts/discipleship-hub/src/data/channels.ts:
 *
 *   Bible Mastery
 *     ├─ Bible Study Methods            (articles → bibleStudyMethods.ts)
 *     ├─ Online Bible Training          → Year 1 / Year 2
 *     ├─ Survey of the Bible            → OT / NT
 *     └─ BibleProject                   → OT / NT
 *   Disciple Making Movement            → Unit 1..4
 *
 * Because these pages are generated (Astro getStaticPaths over the data), a
 * future content edit could silently drop a page or break the parent/child
 * nesting without anyone noticing until it's live. This script re-derives the
 * same route data the pages use and asserts:
 *
 *   1. Every key nested route still resolves (the sub-topic exists, its parent
 *      chain is intact, parents have children, leaves have items, and any
 *      referenced article id maps to a real article body).
 *   2. The intentional "no PDF" allowlist — Survey books whose own generated
 *      article PDF is missing and is patched with a same-book overview PDF —
 *      stays EXACTLY the 3 known slugs. An accidental mismatch (a new missing
 *      book, or one of the 3 silently losing its substitute) fails the check.
 *
 * Exit code is non-zero on any failure so it can gate a build/CI step.
 *
 * Data is loaded at runtime via dynamic import (this script runs under tsx),
 * keeping @workspace/scripts decoupled from the artifact package. The shapes
 * below are a local mirror of the exported types in channels.ts.
 *
 * CLI:
 *   pnpm --filter @workspace/scripts run bible-pages:check
 */
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/* ── Local mirror of the relevant channels.ts / articles.ts shapes ── */
interface SubTopicItem {
  number?: number;
  title: string;
  bookId?: string;
  videoId?: string;
  articleId?: string;
  links?: { pdf?: string; video?: string; app?: string };
}
interface SubTopic {
  id: string;
  channelId: string;
  parentId?: string;
  name: string;
  items?: SubTopicItem[];
}
interface ArticlePdfMeta { title: string; bytes: number; modified: string }
interface BsmArticle { id: string; title: string }
interface BcgArticle { id: string; title: string }

const ROOT = resolve(process.cwd(), "..");
const HUB = resolve(ROOT, "artifacts/discipleship-hub");
const CHANNELS_PATH = resolve(HUB, "src/data/channels.ts");
const ARTICLES_PATH = resolve(HUB, "src/data/articles.ts");
const BSM_PATH = resolve(HUB, "src/data/bibleStudyMethods.ts");
const BCG_PATH = resolve(HUB, "src/data/bcgArticles.ts");

/* Same slug extraction the page (and articles.ts) use. */
const extractAppSlug = (url?: string): string | undefined =>
  url?.match(/app\.jesusonline\.com\/post\/([^/?#]+)/)?.[1];

/* ── Expected structure. Update these ONLY when the content model
   intentionally changes — that is the whole point of the guardrail. ── */

/** Top-level (parent) sub-topics that must exist and must have child cards. */
const EXPECTED_PARENTS: { id: string; children: string[] }[] = [
  {
    id: "bible-mastery",
    children: [
      "bible-study-methods",
      "joshua-nations-online-bible-training",
      "survey-of-the-bible",
      "bibleproject",
    ],
  },
  { id: "survey-of-the-bible", children: ["survey-of-the-bible-ot", "survey-of-the-bible-nt"] },
  { id: "bibleproject", children: ["bibleproject-ot", "bibleproject-nt"] },
  {
    id: "joshua-nations-online-bible-training",
    children: ["online-bible-training-year-1", "online-bible-training-year-2"],
  },
  {
    id: "disciple-making-movement",
    children: [
      "dmm-unit-1-personal-preparation",
      "dmm-unit-2-understanding-the-field",
      "dmm-unit-3-implementing-disciple-making-processes",
      "dmm-unit-4-multiply-disciple-making-movements",
    ],
  },
];

/** Leaf sub-topics that must exist and must carry lesson items. */
const EXPECTED_LEAVES_WITH_ITEMS = [
  "bible-study-methods",
  "survey-of-the-bible-ot",
  "survey-of-the-bible-nt",
  "bibleproject-ot",
  "bibleproject-nt",
  "online-bible-training-year-1",
  "online-bible-training-year-2",
  "dmm-unit-1-personal-preparation",
];

/** A representative article route that must resolve end-to-end. */
const EXPECTED_ARTICLE_ROUTE = {
  subId: "bible-study-methods",
  articleId: "inductive-bible-study",
};

/**
 * Intentional "no PDF" allowlist: Survey-of-the-Bible items whose OWN Joshua
 * Nations survey article PDF is not (yet) generated, so they are patched with a
 * same-book BibleProject overview PDF via links.pdf. This set must stay EXACTLY
 * these 3 slugs. If a 4th book falls out of PDF coverage, or one of these gains
 * its native PDF (or loses its substitute), the check fails so it is reviewed.
 */
const NO_NATIVE_PDF_ALLOWLIST = new Set<string>([
  "93652-4-ezra-and-nehemiah",
  "93653-0-song-of-songs",
  "93653-2-jeremiah",
]);

/** Sub-topics whose items are Survey books sourced from app.jesusonline.com. */
const SURVEY_SUBS = ["survey-of-the-bible-ot", "survey-of-the-bible-nt"];

async function main() {
  const CHANNEL = "church";
  const { subTopics } = (await import(pathToFileURL(CHANNELS_PATH).href)) as {
    subTopics: SubTopic[];
  };
  const { articlePdfs } = (await import(pathToFileURL(ARTICLES_PATH).href)) as {
    articlePdfs: Record<string, ArticlePdfMeta>;
  };
  const { bibleStudyMethods } = (await import(pathToFileURL(BSM_PATH).href)) as {
    bibleStudyMethods: BsmArticle[];
  };
  const { bcgArticles } = (await import(pathToFileURL(BCG_PATH).href)) as {
    bcgArticles: BcgArticle[];
  };

  const byId = new Map(subTopics.map(s => [s.id, s]));
  const errors: string[] = [];
  const hasArticlePdf = (slug?: string) => !!slug && slug in articlePdfs;

  /* 1a. Parents exist, sit in the church channel, and have the expected kids. */
  for (const { id, children } of EXPECTED_PARENTS) {
    const parent = byId.get(id);
    if (!parent) {
      errors.push(`Missing parent sub-topic "${id}" (route /channels/${CHANNEL}/${id} would 404).`);
      continue;
    }
    if (parent.channelId !== CHANNEL) {
      errors.push(`Parent "${id}" is in channel "${parent.channelId}", expected "${CHANNEL}".`);
    }
    const actualChildren = subTopics.filter(s => s.parentId === id).map(s => s.id);
    for (const child of children) {
      if (!actualChildren.includes(child)) {
        errors.push(`Parent "${id}" is missing expected child "${child}".`);
      }
      const childSub = byId.get(child);
      if (childSub && childSub.parentId !== id) {
        errors.push(`Child "${child}" has parentId "${childSub.parentId ?? "(none)"}", expected "${id}".`);
      }
    }
  }

  /* 1b. Leaf pages exist and carry items (an empty leaf renders "coming soon"). */
  for (const id of EXPECTED_LEAVES_WITH_ITEMS) {
    const leaf = byId.get(id);
    if (!leaf) {
      errors.push(`Missing leaf sub-topic "${id}" (route /channels/${CHANNEL}/${id} would 404).`);
      continue;
    }
    if (!leaf.items || leaf.items.length === 0) {
      errors.push(`Leaf "${id}" has no items — page would render the empty "coming soon" state.`);
    }
  }

  /* 1c. Every parentId in the church channel points at a real sub-topic (no
     orphaned nodes that would break breadcrumbs / getStaticPaths nesting). */
  for (const s of subTopics) {
    if (s.channelId === CHANNEL && s.parentId && !byId.has(s.parentId)) {
      errors.push(`Sub-topic "${s.id}" references missing parentId "${s.parentId}".`);
    }
  }

  /* 1d. Representative article route resolves: the item exists, declares the
     articleId, and a matching article body exists (else getStaticPaths skips
     it and the "Read" link 404s). */
  {
    const { subId, articleId } = EXPECTED_ARTICLE_ROUTE;
    const sub = byId.get(subId);
    const item = sub?.items?.find(i => i.articleId === articleId);
    const knownArticle =
      bibleStudyMethods.some(a => a.id === articleId) || bcgArticles.some(a => a.id === articleId);
    if (!sub) {
      errors.push(`Article route parent "${subId}" is missing.`);
    } else if (!item) {
      errors.push(`Sub-topic "${subId}" no longer has an item with articleId "${articleId}".`);
    } else if (!knownArticle) {
      errors.push(`articleId "${articleId}" has no matching article body (route would 404).`);
    }
  }

  /* 1e. Every articleId referenced anywhere in channels resolves to a real
     article body — catches a dropped article page across the whole dataset. */
  const knownArticleIds = new Set([
    ...bibleStudyMethods.map(a => a.id),
    ...bcgArticles.map(a => a.id),
  ]);
  for (const s of subTopics) {
    for (const item of s.items ?? []) {
      if (item.articleId && !knownArticleIds.has(item.articleId)) {
        errors.push(
          `Sub-topic "${s.id}" item "${item.title}" references articleId "${item.articleId}" with no article body.`,
        );
      }
    }
  }

  /* 2. The "no native PDF" allowlist for Survey books stays exactly the 3
     known slugs, each still patched with a links.pdf substitute. */
  const actualNoPdf = new Set<string>();
  for (const id of SURVEY_SUBS) {
    const sub = byId.get(id);
    if (!sub) continue; // already reported above
    for (const item of sub.items ?? []) {
      const slug = extractAppSlug(item.links?.app);
      if (!slug) continue;
      if (!hasArticlePdf(slug)) {
        actualNoPdf.add(slug);
        if (!NO_NATIVE_PDF_ALLOWLIST.has(slug)) {
          errors.push(
            `Survey book "${item.title}" (slug "${slug}") has no article PDF and is NOT in the known allowlist.`,
          );
        } else if (!item.links?.pdf) {
          errors.push(
            `Allowlisted book "${item.title}" (slug "${slug}") lost its links.pdf substitute — its PDF button is now dead.`,
          );
        }
      }
    }
  }
  for (const slug of NO_NATIVE_PDF_ALLOWLIST) {
    if (!actualNoPdf.has(slug)) {
      errors.push(
        `Allowlisted slug "${slug}" now HAS a native article PDF (or no longer appears in the Survey) — remove it from the allowlist.`,
      );
    }
  }

  if (errors.length > 0) {
    console.error(`✗ Bible Mastery page check failed with ${errors.length} issue(s):`);
    for (const e of errors) console.error(`  • ${e}`);
    process.exit(1);
  }

  console.log("✓ Bible Mastery page check passed.");
  console.log(
    `  ${EXPECTED_PARENTS.length} parent nodes, ${EXPECTED_LEAVES_WITH_ITEMS.length} leaf pages, ` +
      `and the "no PDF" allowlist (${NO_NATIVE_PDF_ALLOWLIST.size} book slugs) all verified.`,
  );
}

main().catch(err => {
  console.error("✗ Bible Mastery page check crashed:", err);
  process.exit(1);
});
