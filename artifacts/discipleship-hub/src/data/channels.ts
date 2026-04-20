export type ResourceFormat = "book" | "playlist" | "app";

export type ChannelId = "church" | "growth" | "evidence";

export interface SubTopicItem {
  number: number;
  title: string;
}

export interface SubTopic {
  id: string;
  channelId: ChannelId;
  name: string;
  description?: string;
  formats?: ResourceFormat[];
  items?: SubTopicItem[];
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

export const channels: Channel[] = [
  {
    id: "church",
    name: "Church Resources",
    shortName: "Church",
    tagline: "Multiply disciples and plant vibrant churches",
    description:
      "Develop fruitful, prayer-fueled, Spirit-led ministries that multiply disciples and plant churches, all in obedience to Christ and His inspired Word.",
    accentColor: "#002f55",
    gradient: "linear-gradient(135deg, #0a3f6b 0%, #002f55 55%, #00152a 100%)",
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
    id: "evidence",
    name: "Evidence Resources",
    shortName: "Evidence",
    tagline: "Convince doubters with the truth about Jesus, God, and the Bible",
    description:
      "Persuade doubters with clear, compelling truths about the true identity of Christ, the existence of God, and the reliability of the Bible.",
    accentColor: "#de5b00",
    gradient: "linear-gradient(135deg, #f59e4a 0%, #de5b00 60%, #9f4100 100%)",
  },
];

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
    items: [
      { number: 1, title: "Was Jesus a Real Person?" },
      { number: 2, title: "Was There a Jesus Conspiracy?" },
      { number: 3, title: "Is Jesus God?" },
      { number: 4, title: "Are the Gospel Accounts of Jesus True?" },
      { number: 5, title: "Is Jesus the Jewish Messiah?" },
      { number: 6, title: "Did Jesus Rise from the Dead?" },
      { number: 7, title: "Did Jesus claim to be God?" },
      { number: 8, title: "Did the Apostles Believe Jesus is God?" },
      { number: 9, title: "Why Were Other Gospels Excluded from New Testament?" },
      { number: 10, title: "Is Jesus Relevant Today?" },
      { number: 11, title: "What Is Jesus' Plan for Us?" },
      { number: 12, title: "Is Jesus Coming Back?" },
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
