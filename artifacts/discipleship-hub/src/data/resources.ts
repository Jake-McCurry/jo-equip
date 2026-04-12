export type ResourceType = "pdf" | "article" | "video" | "tool";

export type Resource = {
  id: string;
  title: string;
  type: ResourceType;
  topic: string;
  description: string;
  author: string;
  url: string;
  featured: boolean;
  summary?: string[];
};

export const resources: Resource[] = [
  {
    id: "r1",
    title: "The Attributes of God: A Study Guide",
    type: "pdf",
    topic: "foundations",
    description: "A comprehensive guide examining the incommunicable and communicable attributes of God.",
    author: "Dr. A.W. Tozer Institute",
    url: "#",
    featured: true,
    summary: ["God's aseity and independence", "The holiness and justice of God", "Understanding God's omnipresence"]
  },
  {
    id: "r2",
    title: "How to Study the Bible Effectively",
    type: "article",
    topic: "spiritual-growth",
    description: "An inductive approach to biblical exegesis for lay leaders and disciplers.",
    author: "Global Theological Network",
    url: "#",
    featured: true,
    summary: ["Observation: What does the text say?", "Interpretation: What does the text mean?", "Application: How does it apply?"]
  },
  {
    id: "r3",
    title: "Evangelism in a Post-Christian Context",
    type: "video",
    topic: "evangelism",
    description: "A 40-minute seminar on apologetics and relational evangelism.",
    author: "Rev. Thomas Okonjo",
    url: "#",
    featured: true,
    summary: ["Cultural shifts in modern evangelism", "Building relational bridges", "Answering common objections"]
  },
  {
    id: "r4",
    title: "Discipleship Multiplication Tracker",
    type: "tool",
    topic: "discipleship",
    description: "A printable framework for tracking generational disciple-making.",
    author: "Ministry Equipping Hub",
    url: "#",
    featured: true,
    summary: ["Generational mapping", "Identifying faithful men and women", "Accountability metrics"]
  },
  {
    id: "r5",
    title: "Theology of Prayer",
    type: "article",
    topic: "prayer",
    description: "Why pray if God is sovereign? A theological examination of petitionary prayer.",
    author: "Dr. Sarah Chen",
    url: "#",
    featured: false,
    summary: ["The sovereignty of God and human responsibility", "Historical models of prayer", "Praying the Scriptures"]
  },
  {
    id: "r6",
    title: "Pastoral Burnout Prevention",
    type: "pdf",
    topic: "church-leadership",
    description: "Strategies for sustainable ministry and emotional health.",
    author: "Care for Pastors Initiative",
    url: "#",
    featured: false,
    summary: ["Recognizing early warning signs", "Establishing healthy boundaries", "The role of Sabbath rest"]
  },
  {
    id: "r7",
    title: "Biblical Foundations for Marriage",
    type: "article",
    topic: "family-marriage",
    description: "A theological overview of the marriage covenant.",
    author: "Family Discipleship Ministries",
    url: "#",
    featured: false,
    summary: ["The covenant model vs. contract model", "Roles and responsibilities", "Resolving conflict biblically"]
  },
  {
    id: "r8",
    title: "Cross-Cultural Church Planting",
    type: "pdf",
    topic: "mission-outreach",
    description: "A manual for establishing contextualized, biblical churches.",
    author: "Global Missions Fellowship",
    url: "#",
    featured: false,
    summary: ["Contextualization without compromise", "Identifying local leaders", "Phases of church autonomy"]
  },
  {
    id: "r9",
    title: "Understanding the Trinity",
    type: "video",
    topic: "foundations",
    description: "A teaching session clarifying the orthodox doctrine of the Trinity.",
    author: "Seminary Open Course",
    url: "#",
    featured: false,
    summary: ["Historical development of Trinitarian dogma", "Common heresies to avoid", "Practical implications of Trinitarian worship"]
  },
  {
    id: "r10",
    title: "Fasting as a Spiritual Discipline",
    type: "article",
    topic: "spiritual-growth",
    description: "The history and practice of fasting in the Christian tradition.",
    author: "Spiritual Formation Institute",
    url: "#",
    featured: false,
    summary: ["Biblical examples of fasting", "Physical and spiritual preparation", "Fasting and corporate revival"]
  },
  {
    id: "r11",
    title: "Apologetics Quick Reference",
    type: "tool",
    topic: "evangelism",
    description: "A pocket guide for answering the top 10 objections to Christianity.",
    author: "Defend the Faith Ministries",
    url: "#",
    featured: false,
    summary: ["The problem of evil", "Reliability of the New Testament", "Exclusivity of Christ"]
  },
  {
    id: "r12",
    title: "Elder Qualifications Checklist",
    type: "tool",
    topic: "church-leadership",
    description: "An assessment tool based on 1 Timothy 3 and Titus 1.",
    author: "Biblical Church Leadership",
    url: "#",
    featured: false,
    summary: ["Character requirements", "Teaching ability", "Family management"]
  }
];
