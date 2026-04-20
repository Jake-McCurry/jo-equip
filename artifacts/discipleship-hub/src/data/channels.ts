export type ResourceFormat = "book" | "playlist" | "app" | "pdf" | "video";

export type ChannelId = "church" | "growth" | "evidence";

export interface SubTopicItem {
  number: number;
  title: string;
  /** Optional per-item links (PDF / Video / App) */
  links?: {
    pdf?: string;
    video?: string;
    app?: string;
  };
}

export interface SubTopic {
  id: string;
  channelId: ChannelId;
  name: string;
  description?: string;
  formats?: ResourceFormat[];
  items?: SubTopicItem[];
  /** Link to the JO App series page if available */
  appUrl?: string;
}

export interface Channel {
  id: ChannelId;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  accentColor: string;
  gradient: string;
}

/* Display order: Evidence, Growth, Church */
export const channels: Channel[] = [
  {
    id: "evidence",
    name: "Evidence Resources",
    shortName: "Evidence",
    tagline: "Convince doubters with the truth about Jesus, God, and the Bible",
    description:
      "Persuade doubters with clear, compelling truths about the true identity of Christ, the existence of God, and the reliability of the Bible.",
    accentColor: "#de5b00",
    gradient: "linear-gradient(135deg, #f59e4a 0%, #de5b00 60%, #9f4100 100%)",
  },
  {
    id: "growth",
    name: "Growth Resources",
    shortName: "Growth",
    tagline: "Build believers into mature, fruitful disciples",
    description:
      "Disciple believers to become all that God created them to be, so they may do all that He has created them to do.",
    accentColor: "#00855c",
    gradient: "linear-gradient(135deg, #2dbf85 0%, #00855c 55%, #004d36 100%)",
  },
  {
    id: "church",
    name: "Church Resources",
    shortName: "Church",
    tagline: "Multiply disciples and plant vibrant churches",
    description:
      "Develop fruitful, prayer-fueled, Spirit-led ministries that multiply disciples and plant churches, all in obedience to Christ and His inspired Word.",
    accentColor: "#5b3a8a",
    gradient: "linear-gradient(135deg, #8b65b8 0%, #5b3a8a 55%, #361f5c 100%)",
  },
];

const JO_JESUS_IDENTITY = "https://app.jesusonline.com/series/73";

export const subTopics: SubTopic[] = [
  // ── CHURCH RESOURCES ──
  { id: "understanding-evangelism", channelId: "church", name: "Understanding Evangelism" },
  { id: "sharing-your-faith", channelId: "church", name: "Sharing Your Faith" },
  { id: "next-steps-new-believers", channelId: "church", name: "Next Steps for New Believers" },
  { id: "total-life-discipleship", channelId: "church", name: "Total Life Discipleship" },
  { id: "rapid-church-planting", channelId: "church", name: "Rapid Church Planting" },
  { id: "disciple-making-movement", channelId: "church", name: "Disciple Making Movement" },
  { id: "survey-of-the-bible", channelId: "church", name: "Survey of the Bible" },
  { id: "bible-training-curriculum", channelId: "church", name: "Bible Training Curriculum" },

  // ── GROWTH RESOURCES ──
  { id: "bible-study", channelId: "growth", name: "Bible Study" },
  { id: "devotionals", channelId: "growth", name: "Devotionals" },
  { id: "prayer-guides", channelId: "growth", name: "Prayer Guides" },
  { id: "worship", channelId: "growth", name: "Worship" },
  { id: "experiencing-god", channelId: "growth", name: "Experiencing God 24/7" },
  { id: "solid-foundation", channelId: "growth", name: "Laying a Solid Foundation" },
  { id: "building-blocks", channelId: "growth", name: "Building Blocks for Maturity" },
  { id: "attitude-behavior", channelId: "growth", name: "Attitude and Behavior" },
  { id: "godly-relationships", channelId: "growth", name: "Godly Relationships" },

  // ── EVIDENCE RESOURCES ──
  {
    id: "jesus-true-identity",
    channelId: "evidence",
    name: "Jesus' True Identity",
    formats: ["book", "playlist", "app"],
    appUrl: JO_JESUS_IDENTITY,
    /* Pulled from JO App "Evidence For Jesus' True Identity" series #73 */
    items: [
      { number: 1, title: "Who is the Real Jesus?",                                                 links: { app: JO_JESUS_IDENTITY } },
      { number: 2, title: "Was Jesus a Real Person?",                                               links: { app: JO_JESUS_IDENTITY } },
      { number: 3, title: "Did Jesus Rise from the Dead?",                                          links: { app: JO_JESUS_IDENTITY } },
      { number: 4, title: "Jesus' Death and Resurrection: Copied from Other Ancient Deities?",     links: { app: JO_JESUS_IDENTITY } },
      { number: 5, title: "Harvard Law Professor Puts Jesus' Resurrection on Trial",                links: { app: JO_JESUS_IDENTITY } },
      { number: 6, title: "The Jesus Family Tomb: Fact or Fiction?",                                links: { app: JO_JESUS_IDENTITY } },
      { number: 7, title: "Was Jesus the Messiah?",                                                 links: { app: JO_JESUS_IDENTITY } },
      { number: 8, title: "Is Jesus God?",                                                          links: { app: JO_JESUS_IDENTITY } },
      { number: 9, title: "Did Jesus Claim to Be God?",                                             links: { app: JO_JESUS_IDENTITY } },
      { number: 10, title: "Did the Apostles Believe Jesus Is God?",                                links: { app: JO_JESUS_IDENTITY } },
      { number: 11, title: "Is Jesus the Only Way to God?",                                         links: { app: JO_JESUS_IDENTITY } },
    ],
  },
  {
    id: "existence-of-god",
    channelId: "evidence",
    name: "Existence of God",
    formats: ["book", "playlist", "app"],
    items: [
      { number: 1, title: "Did the Universe Have a Beginning?" },
      { number: 2, title: "Why is Only Earth Suitable for Life?" },
      { number: 3, title: "Is the Universe a Product of Design or Chance?" },
      { number: 4, title: "How Did Life Begin?" },
      { number: 5, title: "Did Darwin Get It Wrong?" },
      { number: 6, title: "Where Are Darwin's Predicted Fossils?" },
      { number: 7, title: "Is a Designer Revealed in Creation?" },
    ],
  },
  {
    id: "reliability-of-the-bible",
    channelId: "evidence",
    name: "Reliability of the Bible",
    formats: ["app"],
    items: [
      { number: 1, title: "Are the Gospels Reliable?" },
      { number: 2, title: "Is the Bible True?" },
      { number: 3, title: "Is the Bible Historically Reliable?" },
      { number: 4, title: "Did the Old Testament Accurately Predict Jesus as the Messiah?" },
      { number: 5, title: "Does the Bible Foretell Future Events Accurately?" },
      { number: 6, title: "Is the Bible's Portrayal of People, Places and Events Accurate?" },
      { number: 7, title: "Is the Bible Consistent with Science?" },
      { number: 8, title: "Does Evidence Support the Bible?" },
    ],
  },
];

export function getChannel(id: string): Channel | undefined {
  return channels.find(c => c.id === id);
}

export function getSubTopicsByChannel(channelId: string): SubTopic[] {
  return subTopics.filter(s => s.channelId === channelId);
}

export function getSubTopic(channelId: string, subId: string): SubTopic | undefined {
  return subTopics.find(s => s.channelId === channelId && s.id === subId);
}

/** Returns the next sub-topic within the same channel, wrapping to first */
export function getNextSubTopic(channelId: string, subId: string): SubTopic | undefined {
  const list = getSubTopicsByChannel(channelId);
  const idx = list.findIndex(s => s.id === subId);
  if (idx === -1 || list.length < 2) return undefined;
  return list[(idx + 1) % list.length];
}
