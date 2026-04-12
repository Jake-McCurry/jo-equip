export type Topic = {
  id: string;
  name: string;
  description: string;
};

export const topics: Topic[] = [
  { id: "foundations", name: "Foundations", description: "Core biblical doctrines and theological essentials for new believers." },
  { id: "spiritual-growth", name: "Spiritual Growth", description: "Resources for personal spiritual disciplines and maturing in faith." },
  { id: "prayer", name: "Prayer", description: "Developing a robust, biblical prayer life and teaching others to pray." },
  { id: "evangelism", name: "Evangelism", description: "Practical and theological guides for sharing the gospel effectively." },
  { id: "discipleship", name: "Discipleship", description: "Methods and models for making multiplying disciples." },
  { id: "church-leadership", name: "Church Leadership", description: "Principles for pastoral ministry, eldership, and church governance." },
  { id: "family-marriage", name: "Family & Marriage", description: "Biblical foundations for family life and marital health." },
  { id: "mission-outreach", name: "Mission & Outreach", description: "Cross-cultural missions, church planting, and global outreach." },
];
