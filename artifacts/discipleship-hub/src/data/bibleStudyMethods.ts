/**
 * Long-form authored articles for Church sub-topics that aren't sourced from
 * the JOM WordPress: the "Bible Study Methods" set (Bible Mastery grouping,
 * /categories/church/bible-study-methods/<articleId>) plus the Sermon Toolbox
 * "Bible Study Tools" resource guide
 * (/categories/church/bible-study-tools/essential-bible-study-tools).
 *
 * Content is stored as the same typed-block sequence used by bcgArticles so
 * the shared article page can render both. Paragraph and list-item strings
 * may contain inline HTML and are rendered with `set:html`, so keep them
 * author-controlled.
 *
 * To add a new article: append an entry here and set the matching `articleId`
 * on the corresponding SubTopicItem in channels.ts. The article route scopes
 * "Next Article" nav to the current sub-topic, so mixing sub-topics in this
 * one array is safe.
 */

import type { ArticleBlock } from "./bcgArticles";

export interface BibleStudyMethodArticle {
  id: string;
  /** Full display title (page <h1>). */
  title: string;
  /** ~155-char SEO meta description + social card subtitle. */
  description: string;
  blocks: ArticleBlock[];
}

export const bibleStudyMethods: BibleStudyMethodArticle[] = [
  {
    id: "inductive-bible-study",
    title: "Inductive Bible Study (OIA)",
    description:
      "The Inductive (OIA) method — Observation, Interpretation, Application — is a simple, powerful way to let Scripture speak for itself and lead you to Jesus.",
    blocks: [
      { type: "p", html: "The Inductive Bible Study method (often called <strong>OIA</strong>) is a simple, powerful, and widely used way to dig into Scripture on your own. It helps you discover what the Bible actually says, what it means in its original context, and how it applies to your life today — without starting with someone else's opinions or preconceived ideas. The goal is to let the text speak for itself, leading you closer to Jesus and real transformation." },
      { type: "p", html: "It boils down to three straightforward steps." },

      { type: "h2", text: "1. Observation — \u201CWhat does the passage say?\u201D" },
      { type: "p", html: "Read the text carefully (multiple times if possible) like a detective. Jot down facts without jumping to meaning yet — this builds a solid foundation." },
      { type: "ul", items: [
        "Who is speaking or writing? Who is the audience? Who are the main people involved?",
        "What is happening? What keywords, ideas, or commands repeat?",
        "When and where does this take place?",
        "Why is it said or done, and how is it expressed (commands, promises, contrasts like \u201Cbut\u201D or \u201Ctherefore\u201D)?",
      ] },
      { type: "p", html: "Notice structure, repeated phrases, lists, questions, or connections between ideas." },

      { type: "h2", text: "2. Interpretation — \u201CWhat does the passage mean?\u201D" },
      { type: "p", html: "Now figure out the author's intended message to the original readers. Use your observations to answer:" },
      { type: "ul", items: [
        "What was the main point or big idea?",
        "How does the context — surrounding verses, the book, or the whole Bible — shape it?",
        "What does this reveal about God, people, sin, salvation, or life with Christ?",
      ] },
      { type: "p", html: "Let Scripture interpret Scripture by comparing related verses. Avoid forcing modern ideas onto the text — aim for the timeless truth the Holy Spirit inspired." },

      { type: "h2", text: "3. Application — \u201CHow does this change me?\u201D" },
      { type: "p", html: "Bring it home personally. Ask, \u201CSo what?\u201D" },
      { type: "ul", items: [
        "What truth should I believe more deeply?",
        "What sin or attitude do I need to repent of?",
        "What action, prayer, or habit should I adopt?",
        "How can this help me love God and others better?",
      ] },
      { type: "p", html: "Make it specific and actionable (for example, \u201CThis week I'll pray daily for patience in my relationships because\u2026\u201D). Then pray for God's help to live it out." },

      { type: "h2", text: "Getting Started" },
      { type: "p", html: "This method keeps things simple yet deep — perfect for daily quiet times, journaling, or group studies. Start with a short passage (a Psalm, a chapter in Philippians, or James 1), pray for the Holy Spirit's guidance, and watch how God's Word comes alive. It's not about being perfect at it right away — it's about consistently meeting Jesus in Scripture and growing in maturity." },
    ],
  },
  {
    id: "soap-method",
    title: "The S.O.A.P. Method",
    description:
      "S.O.A.P. — Scripture, Observation, Application, Prayer — is a simple journaling method that helps God's Word sink in and change your heart in daily devotions.",
    blocks: [
      { type: "p", html: "The <strong>S.O.A.P.</strong> Method is a simple, popular way to study the Bible personally or in a journal — especially great for daily devotionals or quiet times. It helps you move from just reading Scripture to really letting it sink in, change your heart, and connect you with God. The acronym stands for four easy steps." },

      { type: "h2", text: "S — Scripture" },
      { type: "p", html: "Pick a short Bible passage (one verse, a few verses, or a small section). Read it carefully — maybe out loud — then write it out word for word in your notebook or journal. Writing it helps you slow down, notice every word, and let it stick in your mind. Many people say this step alone reveals fresh insights." },

      { type: "h2", text: "O — Observation" },
      { type: "p", html: "Look closely at what the text actually says. Jot down honest observations — no deep interpretation yet, just facts and what catches your eye." },
      { type: "ul", items: [
        "What jumps out at me?",
        "What words, ideas, or phrases repeat or stand out?",
        "Who is speaking? Who is it to? What's happening?",
        "What does this show about God, people, or life?",
      ] },

      { type: "h2", text: "A — Application" },
      { type: "p", html: "Bring it home: how does this truth apply to your life right now? Ask God:" },
      { type: "ul", items: [
        "What should I believe, stop doing, start doing, or change in my attitude or behavior?",
        "How can this help me love God more or love others better?",
      ] },
      { type: "p", html: "Make it personal and practical (for example, \u201CBecause God forgives me fully, I need to forgive the person who hurt me this week\u201D). Be specific so it's actionable." },

      { type: "h2", text: "P — Prayer" },
      { type: "p", html: "Talk to God about what you've learned. Thank Him for the truth, confess if it shows an area of sin or need, ask for help to live it out, and pray for others if the passage leads you there. End your time by responding to God in prayer." },

      { type: "h2", text: "Getting Started" },
      { type: "p", html: "S.O.A.P. keeps Bible study straightforward, heartfelt, and life-changing without needing fancy tools. Grab a notebook, pick a verse (try something from Psalms, Proverbs, or the Gospels to start), pray for the Holy Spirit's help, and give it a try today. You'll be amazed how God's Word speaks directly to you." },
    ],
  },
  {
    id: "topical-bible-study",
    title: "Topical & Thematic Bible Study",
    description:
      "Topical study gathers everything Scripture teaches on one subject — prayer, forgiveness, fear, God's love — so you see the whole biblical picture and apply it.",
    blocks: [
      { type: "p", html: "The <strong>Topical / Thematic</strong> Bible Study method (often just called topical study) is a straightforward way to explore what the whole Bible teaches about a specific subject or theme. Instead of studying one book, chapter, or verse at a time, you search across Scripture to gather all the relevant passages on a topic — like prayer, forgiveness, fear, marriage, God's love, attitude, or godly relationships — and see the big picture God gives." },
      { type: "p", html: "It's especially helpful for answering real-life questions, building doctrine, or growing in areas like maturity and behavior, because it shows how Scripture consistently addresses an issue from Old Testament to New. Here's a simple breakdown of how it works." },

      { type: "h2", text: "1. Choose your topic" },
      { type: "p", html: "Pick something you're curious about, struggling with, or want to understand better (for example, \u201Cpatience,\u201D \u201Cworry,\u201D or \u201Cfriendship\u201D). Start narrow if you're new — broad topics like \u201Clove\u201D can get overwhelming." },

      { type: "h2", text: "2. Gather related verses" },
      { type: "p", html: "Use free tools to find passages, then collect a list (aim to be thorough, but start with 10\u201320 key verses if it's your first time)." },
      { type: "ul", items: [
        "Search keywords in apps and sites like Bible Gateway, Blue Letter Bible, YouVersion, or OpenBible.info/topics.",
        "Look up synonyms or related words (for \u201Cforgiveness,\u201D search \u201Cforgive,\u201D \u201Cpardon,\u201D \u201Cmercy\u201D).",
        "Check topical resources like Nave's Topical Bible or Torrey's Topical Textbook (free on Bible Hub or StudyLight.org).",
      ] },

      { type: "h2", text: "3. Read and observe each passage" },
      { type: "p", html: "Read them in context — don't just grab a verse, look at the surrounding verses. Note:" },
      { type: "ul", items: [
        "What does it actually say about the topic?",
        "Who is speaking, to whom, and in what situation?",
        "Any commands, promises, examples, or warnings?",
      ] },

      { type: "h2", text: "4. Interpret and organize" },
      { type: "p", html: "Ask: what is the main teaching or principle here? Group similar ideas together (for example, God's forgiveness of us versus our forgiving others). Look for patterns — what does the Bible emphasize most? Let Scripture interpret itself by comparing verses." },

      { type: "h2", text: "5. Summarize the big idea" },
      { type: "p", html: "Write a clear summary: \u201CWhat does the Bible as a whole teach about this topic?\u201D Include key truths, balanced views (for example, grace and responsibility), and how it points to Jesus." },

      { type: "h2", text: "6. Apply it personally" },
      { type: "p", html: "Pray and ask: how should this change my thinking, attitudes, or actions? Make it practical (for example, \u201CBecause God commands forgiveness, I'll choose to release resentment toward\u2026\u201D)." },

      { type: "h2", text: "A Flexible, Powerful Tool" },
      { type: "p", html: "This method is flexible — quick for a short devotional or deep for weeks of study. It's powerful for personal growth because it lets God's Word shape your views directly." },
    ],
  },
  {
    id: "bible-recap",
    title: "Bible R.E.C.A.P.",
    description:
      "R.E.C.A.P. — Revelation, Example, Command, Application, Promise — five questions that help you hear the Holy Spirit and obey God's Word every time you read.",
    blocks: [
      { type: "quote", html: "All Scripture is inspired by God and is useful to teach us what is true and to make us realize what is wrong in our lives. It corrects us when we are wrong and teaches us to do what is right. God uses it to prepare and equip his people to do every good work.", cite: "2 Timothy 3:16\u201317 (NLT)" },
      { type: "p", html: "When we habitually renew our minds with the truth of God's Word and faithfully follow His directions and instructions, we become more Christ-like." },
      { type: "p", html: "The Word of God is the language of the Holy Spirit. The Holy Spirit will open our minds to understand the Word and empower us to obey and live out its truth. Within its pages, He reveals what is true and exposes what is not." },
      { type: "p", html: "Whenever you read the Bible, be prayerful, asking the Holy Spirit to guide you into all truth (John 16:13). Then trust His guidance and ask yourself questions: What does this mean? How does this apply to my life? The following method will help you ask key questions." },

      { type: "h2", text: "Five Questions to Ask" },
      { type: "p", html: "When you read the Bible, you can ask one or more of the following five questions." },
      { type: "ul", items: [
        "<strong>R</strong> — Is there a <strong>revelation</strong> about God that I should embrace?",
        "<strong>E</strong> — Is there an <strong>example</strong> I should follow or avoid?",
        "<strong>C</strong> — Is there a <strong>command</strong> I should obey?",
        "<strong>A</strong> — Is there something I need to <strong>apply</strong> to my life?",
        "<strong>P</strong> — Is there a <strong>promise</strong> I should claim?",
      ] },

      { type: "h2", text: "An Example" },
      { type: "p", html: "John 3:16 is a revelation of God's unconditional love in His Son, so you can highlight the verse with orange (Revelation). John 13:34 is a command to love one another, so you can highlight the verse with red (Command). John 14:21 is a promise that Jesus will manifest Himself to us if we love and obey Him, so you can highlight the verse with purple (Promise)." },
      { type: "p", html: "Highlight Bible passages and code them with a R.E.C.A.P. letter for future review in your Bible notes." },

      { type: "h2", text: "Read Prayerfully" },
      { type: "p", html: "As you read, talk to God about everything you are thinking. It may be helpful to write down what you have discovered from the reading and your reflection. Be mindful of His presence and His love. Thank Him for what you are reading, learning, and thinking. Give Him your focused attention and concentration." },
    ],
  },

  /* ── Sermon Toolbox › Bible Study Tools ──
     Resource guide sourced from the user's "Bible Study Tools" docx
     (July 2026). External links restored from the docx hyperlink rels;
     all verified live at authoring time. */
  {
    id: "essential-bible-study-tools",
    title: "Bible Study Tools",
    description:
      "A curated guide to trusted, free Bible study tools — the NET Bible, Bible Gateway, Bible Hub, BibleProject, and more — for sermon preparation and serious study.",
    blocks: [
      { type: "p", html: "Great sermons and Bible teaching begin with careful study of God's Word. The free tools below put translations, commentaries, original-language helps, and study resources within reach of every pastor, teacher, and serious Bible student." },

      { type: "h2", text: "NET Bible" },
      { type: "p", html: "The NET (New English Translation) Bible is available in the JO App (app.jesusonline.com). <a href=\"https://app.jesusonline.com/reader\" target=\"_blank\" rel=\"noopener noreferrer\">Read the NET Bible on the JO App</a>." },
      { type: "p", html: "NET Bible also offers a free online Bible at <a href=\"https://netbible.org/\" target=\"_blank\" rel=\"noopener noreferrer\">netbible.org</a>. This site provides 60,932 notes by more than 25 scholars — experts in the original biblical languages — who translated the NET Bible directly from the best currently available Hebrew, Aramaic, and Greek texts. The website is a great reference source for serious Bible students." },

      { type: "h2", text: "Bible Gateway" },
      { type: "p", html: "<a href=\"https://www.biblegateway.com/\" target=\"_blank\" rel=\"noopener noreferrer\">Bible Gateway</a> (biblegateway.com) is a searchable online Bible tool hosting more than 200 versions of the Bible in over 70 languages that you can freely read, research, and reference anywhere. Including a library of audio Bibles, mobile apps, devotionals, email newsletters, and other free resources, Bible Gateway equips you not only to read the Bible, but to understand it." },
      { type: "ul", items: [
        "<a href=\"https://www.biblegateway.com/passage/\" target=\"_blank\" rel=\"noopener noreferrer\">Lookup Passage</a>",
        "<a href=\"https://www.biblegateway.com/keyword/\" target=\"_blank\" rel=\"noopener noreferrer\">Keyword Search</a>",
        "<a href=\"https://www.biblegateway.com/topical/\" target=\"_blank\" rel=\"noopener noreferrer\">Topical Index</a>",
      ] },

      { type: "h2", text: "Bible Hub" },
      { type: "p", html: "<a href=\"https://biblehub.com/\" target=\"_blank\" rel=\"noopener noreferrer\">Bible Hub</a> (biblehub.com) is an online parallel Bible with search and study tools including parallel texts, cross references, Treasury of Scripture, and commentaries. This site provides quick access to topical studies, interlinears, sermons, Strong's and many more resources, and is a great way to link any verse on your site to an instant menu of 25 versions. This website allows you to:" },
      { type: "ul", items: [
        "<strong>Search:</strong> Enter any combination of book, abbreviation, chapter, verse, or keyword.",
        "<strong>Read:</strong> Click any version name to read the full chapter for that text.",
        "<strong>Study:</strong> Click any study tab to view <a href=\"https://biblehub.com/sermons/matthew/1-1.htm\" target=\"_blank\" rel=\"noopener noreferrer\">sermons</a>, <a href=\"https://biblehub.com/topical/matthew/1-1.htm\" target=\"_blank\" rel=\"noopener noreferrer\">topics</a>, <a href=\"https://biblehub.com/commentaries/matthew/1-1.htm\" target=\"_blank\" rel=\"noopener noreferrer\">commentaries</a>, <a href=\"https://biblehub.com/interlinear/\" target=\"_blank\" rel=\"noopener noreferrer\">interlinear</a>, <a href=\"https://biblehub.com/strongs.htm\" target=\"_blank\" rel=\"noopener noreferrer\">Strong's</a>, or <a href=\"https://biblehub.com/text/matthew/1-1.htm\" target=\"_blank\" rel=\"noopener noreferrer\">Greek and Hebrew</a> for your passage.",
      ] },

      { type: "h2", text: "Bible Study Tools" },
      { type: "p", html: "<a href=\"https://www.biblestudytools.com/\" target=\"_blank\" rel=\"noopener noreferrer\">Bible Study Tools</a> (biblestudytools.com) is the largest free online Bible website for verse search and in-depth studies. It aims to offer the freshest and most compelling biblically-based content to Christians who take their relationship with Christ seriously, giving Christians of any age and at any stage the opportunity to read, study, understand, and apply the Bible to their lives. With free devotionals, study guides, helpful articles, and rich personalization functions, visitors can make the most of their Bible study time and unlock its meaning:" },
      { type: "ul", items: [
        "<a href=\"https://www.biblestudytools.com/devotionals/\" target=\"_blank\" rel=\"noopener noreferrer\">Devotionals</a>",
        "<a href=\"https://www.biblestudytools.com/topical-verses/\" target=\"_blank\" rel=\"noopener noreferrer\">Topical Verses</a>",
        "<a href=\"https://www.biblestudytools.com/commentaries/\" target=\"_blank\" rel=\"noopener noreferrer\">Bible Commentaries</a>",
        "<a href=\"https://www.biblestudytools.com/concordances/\" target=\"_blank\" rel=\"noopener noreferrer\">Bible Concordances</a>",
        "<a href=\"https://www.biblestudytools.com/dictionaries/\" target=\"_blank\" rel=\"noopener noreferrer\">Bible Dictionaries</a>",
        "<a href=\"https://www.biblestudytools.com/encyclopedias/\" target=\"_blank\" rel=\"noopener noreferrer\">Encyclopedias</a>",
        "<a href=\"https://www.biblestudytools.com/history/\" target=\"_blank\" rel=\"noopener noreferrer\">Church History</a>",
        "<a href=\"https://www.biblestudytools.com/classics/\" target=\"_blank\" rel=\"noopener noreferrer\">Christian Classics</a>",
        "<a href=\"https://www.biblestudytools.com/pastor-resources/\" target=\"_blank\" rel=\"noopener noreferrer\">Pastor Resources</a>",
        "<a href=\"https://www.biblestudytools.com/sunday-school-lessons/\" target=\"_blank\" rel=\"noopener noreferrer\">Sunday School Lessons</a>",
      ] },

      { type: "h2", text: "BibleProject" },
      { type: "p", html: "Explore the <a href=\"https://bibleproject.com/explore/\" target=\"_blank\" rel=\"noopener noreferrer\">BibleProject animated videos</a> about the books of the Bible and various Bible themes like Holiness, Holy Spirit, The Messiah, The Covenants, and many more." },
      { type: "p", html: "From page one to the final word, the Bible is a unified story that leads to Jesus. In addition to videos and podcasts, their Bible resources help people experience the Bible in a way that is approachable, engaging, and transformative." },
      { type: "p", html: "To learn more about their ministry and find Bible study resources, visit <a href=\"https://bibleproject.com/\" target=\"_blank\" rel=\"noopener noreferrer\">bibleproject.com</a>." },

      { type: "h2", text: "The Gospel Coalition" },
      { type: "p", html: "<a href=\"https://www.thegospelcoalition.org/\" target=\"_blank\" rel=\"noopener noreferrer\">The Gospel Coalition</a> is a global fellowship of evangelical churches in the Reformed tradition deeply committed to renewing our faith in the gospel of Christ and to reforming our ministry practices to conform fully to the Scriptures." },
      { type: "p", html: "Their website (thegospelcoalition.org) offers daily Bible reading and devotionals, articles, blogs, commentary, essays, and other resources. They also offer different country editions in several different languages." },
      { type: "p", html: "Try their <a href=\"https://www.thegospelcoalition.org/commentary/\" target=\"_blank\" rel=\"noopener noreferrer\">Bible commentary in the U.S. Edition</a>." },

      { type: "h2", text: "The Navigators Bible Study Tools" },
      { type: "p", html: "The Navigators is a ministry that shares the gospel of Jesus and helps people grow in their relationship with Him through <a href=\"https://www.navigators.org/life-to-life/\" target=\"_blank\" rel=\"noopener noreferrer\">Life-to-Life®</a> discipleship, creating spiritual generations of believers." },
      { type: "p", html: "Browse through their <a href=\"https://www.navigators.org/resource/bible-study-tools/\" target=\"_blank\" rel=\"noopener noreferrer\">most popular Bible study tools</a>, including free PDF downloads, book excerpts, and even full eBooks. As you explore these Bible study resources, discover new and fresh ways to read and apply Scripture." },
      { type: "p", html: "Visit <a href=\"https://www.navigators.org/resource/\" target=\"_blank\" rel=\"noopener noreferrer\">The Navigators</a> for more resources." },

      { type: "h2", text: "English Bible Translations" },
      { type: "p", html: "The original manuscripts of the Bible — known as the autographs — were written by their respective authors but have not survived. Nevertheless, the biblical text has been faithfully preserved and transmitted through thousands of ancient manuscripts and fragments discovered around the world." },
      { type: "p", html: "The Scriptures were originally composed in Hebrew (most of the Old Testament), Aramaic (small portions of the Old Testament), and Greek (the entire New Testament). Biblical scholars carefully study and compare these and other Latin manuscripts to produce accurate translations of the Bible into modern languages." },
      { type: "p", html: "Today, there are many English versions of the Bible. \u201C<a href=\"https://www.olivetree.com/blog/a-guide-to-finding-the-right-bible-translation/\" target=\"_blank\" rel=\"noopener noreferrer\">A Guide to Finding the Right Bible Translation</a>\u201D by Olive Tree Bible Software will help you understand different English translations." },

      { type: "h2", text: "Scripture Memorization" },
      { type: "p", html: "The Navigators shows you how to memorize Scripture with a proven method. Read the article, \u201C<a href=\"https://www.navigators.org/resource/how-to-memorize-scripture/\" target=\"_blank\" rel=\"noopener noreferrer\">How to Memorize Scripture</a>.\u201D" },
      { type: "p", html: "The <a href=\"https://www.navigators.org/resource/topical-memory-system/\" target=\"_blank\" rel=\"noopener noreferrer\">Topical Memory System (TMS)</a> is a simple, easy-to-use system for memorizing key Bible verses that point to essential gospel truths." },
    ],
  },
];

export function getBibleStudyMethod(id: string): BibleStudyMethodArticle | undefined {
  return bibleStudyMethods.find(a => a.id === id);
}

/** Next method in declaration order (no wrap; undefined if last). */
export function getNextBibleStudyMethod(id: string): BibleStudyMethodArticle | undefined {
  const idx = bibleStudyMethods.findIndex(a => a.id === id);
  return idx >= 0 && idx + 1 < bibleStudyMethods.length ? bibleStudyMethods[idx + 1] : undefined;
}
