export type ResourceFormat = "book" | "playlist" | "app" | "pdf" | "video";

export type ChannelId = "church" | "growth" | "evidence";

export interface SubTopicItem {
  number: number;
  title: string;
  /** ID of a book in src/data/books.ts — when set, this item's PDF button links to that book. */
  bookId?: string;
  /** ID of a YouTube video inside this sub-topic's `playlistId` — when set, this item's Video button deep-links to that video. */
  videoId?: string;
  /** Optional per-item external link overrides. */
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
  /** ID of a playlist in src/data/playlists.ts — required for any item.videoId to resolve to a /playlist deep-link. */
  playlistId?: string;
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

/* Display order: Evidence, Growth, Church
 * Channel palette (palette B — softer pastoral feel; reserves orange #de5b00 for links).
 * Evidence = Slate Blue, Growth = Sage, Church = Plum. */
export const channels: Channel[] = [
  {
    id: "evidence",
    name: "Evidence Resources",
    shortName: "Evidence",
    tagline: "Reach skeptics with evidence about Jesus",
    description:
      "Persuade doubters with clear, compelling facts about the true identity of Christ, the existence of God, and the reliability of the Bible.",
    accentColor: "#3b5a99",
    gradient: "linear-gradient(135deg, #6e8ac1 0%, #3b5a99 60%, #243a66 100%)",
  },
  {
    id: "growth",
    name: "Growth Resources",
    shortName: "Growth",
    tagline: "Build believers into mature, fruitful disciples",
    description:
      "Disciple believers to become all that God created them to be, so they may do all that He has created them to do.",
    accentColor: "#4c8a4c",
    gradient: "linear-gradient(135deg, #7ab87a 0%, #4c8a4c 55%, #2d5a2d 100%)",
  },
  {
    id: "church",
    name: "Church Resources",
    shortName: "Church",
    tagline: "Multiply disciples and plant vibrant churches",
    description:
      "Develop fruitful, prayer-fueled, Spirit-led ministries that multiply disciples and plant churches, all in obedience to Christ and His inspired Word.",
    accentColor: "#7a3a8a",
    gradient: "linear-gradient(135deg, #a675b8 0%, #7a3a8a 55%, #4d2058 100%)",
  },
];

const JO_JESUS_IDENTITY = "https://app.jesusonline.com/series/73";

export const subTopics: SubTopic[] = [
  // ── CHURCH RESOURCES ──
  { id: "make-multiply-disciples-newsletter", channelId: "church", name: "Making & Multiplying Disciples Newsletter" },
  {
    id: "total-life-discipleship-principles",
    channelId: "church",
    name: "Total Life Discipleship Core Principles",
    formats: ["playlist"],
    playlistId: "total-life-discipleship-core-principles",
    /* Each item videoId matches a video inside the
       `total-life-discipleship-core-principles` playlist (see playlists.ts),
       so each Video button deep-links to the right video in /playlist/<id>?play=<videoId>. */
    items: [
      { number: 1,  title: "What Is Total Life Discipleship?",                                                 videoId: "XU3PUCwaKos" },
      { number: 2,  title: "Total Life Discipleship: God's Vision",                                            videoId: "psw_5rn9WFY" },
      { number: 3,  title: "Total Life Discipleship: Personal Transformation",                                 videoId: "56GWpb0F2qU" },
      { number: 4,  title: "Total Life Discipleship: Eternal Impact",                                          videoId: "Wq2g9GTgc_Q" },
      { number: 5,  title: "Total Life Discipleship: Kingdom Maturity",                                        videoId: "ysSDA-Aq_ck" },
      { number: 6,  title: "Total Life Discipleship: Kingdom Faith",                                           videoId: "M2rPlUzj50Y" },
      { number: 7,  title: "Total Life Discipleship: Kingdom Power - Be Filled with the Holy Spirit",          videoId: "E78uWvxZOOM" },
      { number: 8,  title: "Total Life Discipleship: Kingdom Power - Walk in the Spirit",                      videoId: "S-4pXuEF1FI" },
      { number: 9,  title: "Total Life Discipleship: Kingdom Prayer - Topics",                                 videoId: "MtX-fFMtXG4" },
      { number: 10, title: "Total Life Discipleship: Kingdom Prayer - Building Blocks",                        videoId: "E46dx0kLSRQ" },
      { number: 11, title: "Total Life Discipleship: Kingdom Promises",                                        videoId: "You5ArBCx1U" },
      { number: 12, title: "Total Life Discipleship: Kingdom Authority",                                       videoId: "gAInNUwcbpU" },
    ],
  },
  {
    id: "become-growing-church",
    channelId: "church",
    name: "Become a Growing Church",
    /* 12 attributes of a growing church. No playlist/book mappings yet — items render with grayed action buttons. */
    items: [
      { number: 1,  title: "A Unique Church Vision" },
      { number: 2,  title: "A Hope-Filled Church" },
      { number: 3,  title: "A Total Life Discipleship Church" },
      { number: 4,  title: "A JesusOnline Media-Resourced Church" },
      { number: 5,  title: "A God-Exalting Church" },
      { number: 6,  title: "A Spirit-Dependent Church" },
      { number: 7,  title: "A Life Application Church" },
      { number: 8,  title: "A Loving Relational Church" },
      { number: 9,  title: "An Online Outreach Church" },
      { number: 10, title: "An Attractive Church" },
      { number: 11, title: "An Inviting Church" },
      { number: 12, title: "A Model / Example Church" },
    ],
  },
  { id: "understanding-evangelism", channelId: "church", name: "Understanding Evangelism" },
  { id: "sharing-your-faith", channelId: "church", name: "Sharing Your Faith" },
  { id: "next-steps-new-believers", channelId: "church", name: "Next Steps for New Believers" },
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
    playlistId: "who-is-the-real-jesus",
    /* Pulled from JO App "Evidence For Jesus' True Identity" series #73.
       Per-item bookId / videoId set only where a specific PDF / video matches the item title. */
    items: [
      { number: 1, title: "Who is the Real Jesus?",                                                 bookId: "who-is-the-real-jesus", videoId: "BVxw0pojBHM", links: { app: JO_JESUS_IDENTITY } },
      { number: 2, title: "Was Jesus a Real Person?",                                               videoId: "vQ0Wro-Rgtw",          links: { app: JO_JESUS_IDENTITY } },
      { number: 3, title: "Did Jesus Rise from the Dead?",                                          videoId: "T_78mbFTmYY",          links: { app: JO_JESUS_IDENTITY } },
      { number: 4, title: "Jesus' Death and Resurrection: Copied from Other Ancient Deities?",                                       links: { app: JO_JESUS_IDENTITY } },
      { number: 5, title: "Harvard Law Professor Puts Jesus' Resurrection on Trial",                                                 links: { app: JO_JESUS_IDENTITY } },
      { number: 6, title: "The Jesus Family Tomb: Fact or Fiction?",                                                                 links: { app: JO_JESUS_IDENTITY } },
      { number: 7, title: "Was Jesus the Messiah?",                                                 videoId: "Jn1M1c9iNfg",          links: { app: JO_JESUS_IDENTITY } },
      { number: 8, title: "Is Jesus God?",                                                          videoId: "9pIWZfEAV0I",          links: { app: JO_JESUS_IDENTITY } },
      { number: 9, title: "Did Jesus Claim to Be God?",                                                                              links: { app: JO_JESUS_IDENTITY } },
      { number: 10, title: "Did the Apostles Believe Jesus Is God?",                                                                 links: { app: JO_JESUS_IDENTITY } },
      { number: 11, title: "Is Jesus the Only Way to God?",                                                                          links: { app: JO_JESUS_IDENTITY } },
    ],
  },
  {
    id: "existence-of-god",
    channelId: "evidence",
    name: "Existence of God",
    formats: ["book", "playlist", "app"],
    playlistId: "science-and-the-origin-of-life",
    items: [
      { number: 1, title: "Did the Universe Have a Beginning?", videoId: "-z8D-mutYUg" },
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
