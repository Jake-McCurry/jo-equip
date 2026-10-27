/* Horizontal topic carousels shown in a white banner directly beneath the
 * blue header on exactly four pages. Labels/order come verbatim from the
 * supplied DOCX. Category destinations are resolved against channels.ts at
 * build time — a target that doesn't exist (bad sub-topic, missing or
 * unlisted article) throws, so the carousel can never ship a dead link. */
import { subTopics, type ChannelId } from "./channels";

type Target =
  | { page: string } // existing top-level route, e.g. "/bible"
  | { channel: ChannelId; sub: string; article?: string };

interface CarouselEntry { label: string; to: Target }
export interface CarouselLink { label: string; path: string }

const t = (label: string, to: Target): CarouselEntry => ({ label, to });
const sub = (channel: ChannelId, s: string, article?: string): Target => ({ channel, sub: s, article });

const carousels: Record<string, { label: string; items: CarouselEntry[] }> = {
  "/": {
    label: "Popular topics",
    items: [
      t("Bible", { page: "/bible" }),
      t("Sermon Tools", { page: "/sermon-helps" }),
      t("Church Growth", { page: "/church-strategies" }),
      t("Evangelism", { page: "/evangelism-tools" }),
      t("Prayer", sub("growth", "prayer")),
      t("Holy Spirit", sub("growth", "ministry-holy-spirit")),
      t("Discipleship", { page: "/discipleship" }),
      t("Identity in Christ", sub("growth", "identity-in-christ")),
      t("Devotionals", sub("growth", "devotionals")),
      t("Hope in Crisis", sub("growth", "hope-times-crisis")),
      t("Godly Relationships", sub("growth", "godly-relationships")),
      t("Attributes of God", sub("growth", "attributes-of-god")),
    ],
  },
  "/categories/evidence": {
    label: "Evidence questions",
    items: [
      t("Resurrection?", sub("evidence", "jesus-true-identity", "did-jesus-rise-from-the-dead")),
      t("Bible True?", sub("evidence", "reliability-of-the-bible", "is-the-bible-true")),
      t("Real Jesus?", sub("evidence", "jesus-true-identity", "who-is-the-real-jesus")),
      t("How Life Began?", sub("evidence", "existence-of-god", "how-did-life-begin")),
      t("Gospels Reliable?", sub("evidence", "reliability-of-the-bible", "are-the-gospel-accounts-of-jesus-true")),
      t("Jesus God?", sub("evidence", "jesus-true-identity", "is-jesus-god")),
      t("Universe Beginning?", sub("evidence", "existence-of-god", "does-the-universe-have-a-beginning")),
      t("Design or Chance?", sub("evidence", "existence-of-god", "is-the-universe-a-product-of-design-or-chance")),
      t("Resurrection on Trial?", sub("evidence", "jesus-true-identity", "harvard-law-professor-puts-jesus-resurrection-on-trial")),
      t("Only Way to God?", sub("evidence", "jesus-true-identity", "is-jesus-the-only-way-to-god")),
      t("Designer in Creation?", sub("evidence", "existence-of-god", "is-a-designer-revealed-in-creation")),
    ],
  },
  "/categories/growth": {
    label: "Growth topics",
    items: [
      t("Prayer", sub("growth", "prayer")),
      t("Holy Spirit", sub("growth", "ministry-holy-spirit")),
      t("Identity in Christ", sub("growth", "identity-in-christ")),
      t("Promises", sub("growth", "bible-promises-hope")),
      t("Devotionals", sub("growth", "devotionals")),
      t("Attributes of God", sub("growth", "attributes-of-god")),
      t("Hope", sub("growth", "hope-times-crisis")),
      t("Bible Studies", sub("growth", "bible-study")),
      t("Marriage", sub("growth", "successful-marriage")),
      t("Relationships", sub("growth", "godly-relationships")),
      t("Behavior", sub("growth", "attitude-behavior")),
      t("Inner Peace", sub("growth", "inner-peace")),
    ],
  },
  "/categories/church": {
    label: "Church topics",
    items: [
      t("Church Growth", sub("church", "become-growing-church")),
      t("Sermon Toolbox", sub("church", "sermon-toolbox")),
      t("Biblical Counseling", sub("church", "biblical-counseling-insights")),
      t("Share Jesus", sub("church", "share-jesus")),
      t("Bible Mastery", sub("church", "bible-mastery")),
      t("Church Planting", sub("church", "rapid-church-planting")),
      t("Total Life Discipleship", sub("church", "total-life-discipleship-principles")),
      t("Great Commission", sub("church", "become-growing-church", "a-great-commission-church")),
      t("Online Outreach", sub("church", "become-growing-church", "an-online-outreach-church")),
      t("Transformational Teaching", sub("church", "become-growing-church", "a-transformational-teaching-church")),
      t("Spirit-dependent", sub("church", "become-growing-church", "a-spirit-dependent-church")),
    ],
  },
};

function resolve(to: Target, label: string): string {
  if ("page" in to) return to.page;
  const s = subTopics.find(x => x.id === to.sub && x.channelId === to.channel);
  if (!s) throw new Error(`topicCarousels: "${label}" → unknown sub-topic ${to.channel}/${to.sub}`);
  if (!to.article) return `/categories/${to.channel}/${to.sub}`;
  const item = s.items?.find(i => i.articleId === to.article);
  if (!item || item.unlisted) throw new Error(`topicCarousels: "${label}" → missing article ${to.sub}/${to.article}`);
  return `/categories/${to.channel}/${to.sub}/${to.article}`;
}

/** Returns the carousel for a base-stripped path, or null (only 4 pages have one). */
export function getTopicCarousel(path: string): { label: string; links: CarouselLink[] } | null {
  const key = path.length > 1 ? path.replace(/\/+$/, "") : path;
  const c = carousels[key];
  if (!c) return null;
  return { label: c.label, links: c.items.map(i => ({ label: i.label, path: resolve(i.to, i.label) })) };
}
