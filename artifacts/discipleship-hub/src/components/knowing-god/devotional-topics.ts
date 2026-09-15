import { devotionalGuideCategories } from "../../data/knowing-god/introduction/devotional-guide.ts";

// The guide uses source typography (e.g. “Joy.” and “Non-impossibilitation”).
// Match words rather than punctuation, without maintaining a second topic list.
export const devotionalTopicKey = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9]/g, "");

const devotionalTitles = new Set(
  devotionalGuideCategories.flatMap(category =>
    category.entries.map(entry => devotionalTopicKey(entry.topic)),
  ),
);

export const isDevotionalTopic = (topic: { title: string }) =>
  devotionalTitles.has(devotionalTopicKey(topic.title));