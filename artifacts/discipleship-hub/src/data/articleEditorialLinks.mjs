// Web-only editorial links. Keep generated manuscripts and downloadable PDFs
// unchanged; scope each link to the exact article and sentence approved.
export const fruitOfTheSpiritHref = "/categories/growth/ministry-holy-spirit/the-fruit-of-the-spirit";

export const fruitOfTheSpiritLinks = [
  ["forever-loved-jesus-life-of-love", "lesson-8-jesus-is-the-vine", "Fruit of the Spirit", "Fruit of the Spirit is God’s nature expressing itself through us."],
  ["lords-prayer-guidance", "making-sure-the-direction-is-from-god", "fruit of the Spirit", "“But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faithfulness.”"],
  ["adventure-living-jesus", "faith-the-key-to-walking-in-the-spirit", "fruit of the Spirit", "The Holy Spirit wants to produce the fruit of the Spirit in your life, which is identified as:"],
  ["tld-kingdom-perspective", "kingdom-power-walk-in-the-spirit", "fruit of the Spirit", "When you walk in the Spirit, your life will naturally produce the fruit of the Spirit."],
  ["heart-problem", "why-did-i-say-that", "fruit of the Holy Spirit", "When we clean up our hearts by confessing our anger to God, He can then give us the fruit of the Holy Spirit to fill its place."],
  ["heart-problem", "are-you-angry", "fruit of the Spirit", "When you have a cleansed heart, you can ask God for the power of the Holy Spirit to produce the fruit of the Spirit in your life."],
  ["heart-problem", "dont-be-a-better-actor", "fruit of the Holy Spirit", "Then you need to admit to God that you are helpless to produce the fruit that He wants in your life, the fruit of the Holy Spirit."],
  ["abiding-christ", "3-experiencing-the-holy-spirits-joy-and-peace", "fruit of the Spirit", "When you are walking in the Spirit, you will experience all of the fruit of the Spirit, including joy and peace."],
  ["from-cope-cure", "i-need-to-forgive-those-soldiers", "fruit of the Spirit", "The gift was the fruit of the Spirit. It was freely available to my people, and I believed it was also available to them."],
  ["hearing-voice-god", "created-to-bear-fruit-for-god", "fruit of the Spirit", "Then the fruit of the Spirit will be produced in your character: love, joy, peace, patience, kindness, faithfulness, gentleness, and self-control."],
];

/** @template {{channelId: string, subId: string, id: string, blocks: any[]}} T
 * @param {T} article
 * @returns {T}
 */
export function applyArticleEditorialLinks(article) {
  const rule = fruitOfTheSpiritLinks.find(
    ([subId, id]) => article.subId === subId && article.id === id,
  );
  if (!rule) return article;
  const [, , label, sentence] = rule;
  const linkedSentence = sentence.replace(label, `<a href="${fruitOfTheSpiritHref}">${label}</a>`);
  let matches = 0;
  const link = (html) => {
    // Already-linked content remains stable if processed again.
    matches += html.split(linkedSentence).length - 1;
    return html.replaceAll(sentence, () => {
      matches++;
      return linkedSentence;
    });
  };
  const blocks = article.blocks.map(block => {
    if (block.type === "p") return { ...block, html: link(block.html) };
    if (block.type === "ul" || block.type === "ol") {
      return { ...block, items: block.items.map(link) };
    }
    return block;
  });
  if (matches !== 1) {
    throw new Error(`Editorial link expected one sentence in ${article.subId}/${article.id}; found ${matches}`);
  }
  return { ...article, blocks };
}
