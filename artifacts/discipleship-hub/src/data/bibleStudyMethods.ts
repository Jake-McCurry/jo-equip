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
    title: "Inductive Bible Study",
    description:
      "The Inductive (OIA) method — Observation, Interpretation, Application — is a simple, powerful way to let Scripture speak for itself and lead you to Jesus.",
    blocks: [
      { type: "p", html: "The Inductive Bible Study method, often called <strong>OIA—Observation, Interpretation, Application</strong>—is a simple, powerful, and widely used way to dig into Scripture on your own. It helps you discover what the Bible actually says, what it means in its original context, and how it applies to your life today. You start with the text of the Bible rather than with someone else’s opinions, commentaries, or preconceived ideas. The goal is to let the text speak for itself, leading you closer to Jesus and real transformation." },

      { type: "h2", text: "1. Observation — \u201CWhat does the passage say?\u201D" },
      { type: "p", html: "The first step is to read the text carefully and multiple times, if possible, like a detective. Pay attention to what is actually there. Notice the people, setting, repeated words, commands, promises, reasons, contrasts, connections between ideas, and other details. Jot down facts without jumping to meaning yet. Learn to see what the passage says. This is harder than you think. This builds a solid foundation for the next step." },
      { type: "ul", items: [
        "Who is speaking or writing? Who is the audience? Who are the main people involved?",
        "What is happening? What are the circumstances?",
        "What keywords, ideas, or commands repeat?",
        "When and where does this take place?",
        "Why is it said or done, and how is it expressed (commands, promises, contrasts like \u201Cbut\u201D or \u201Ctherefore\u201D)?",
      ] },
      { type: "p", html: "The passages may not give you all the answers all the time. If you have time, read the surrounding passages, the entire chapter, or the entire book to find the answers." },

      { type: "h2", text: "2. Interpretation — \u201CWhat does the passage mean?\u201D" },
      { type: "p", html: "The next step is to figure out the author’s intended message to the original readers in their particular situation. Use your observations to answer:" },
      { type: "ul", items: [
        "What was the main point or big idea?",
        "How does the context — surrounding verses, the book, or the whole Bible — shape it?",
        "What does this reveal about God, people, sin, salvation, or life with Christ?",
      ] },
      { type: "p", html: "Let Scripture interpret Scripture by comparing related verses." },
      { type: "p", html: "Since most of us do not know much about the world of the Bible, we naturally read Scripture through the lens of our own time, culture, and experience. That is not necessarily wrong, but it affects how we interpret what we read." },
      { type: "p", html: "We cannot always know everything about the original situation when we first read a passage. We begin with what the text tells us and some of the discoveries we have made in observation, then use the Bible itself and reliable outside resources (commentaries, for example) to fill in what we do not yet know." },
      { type: "p", html: "Your first interpretation may not be complete, and that is okay. As you learn more about the historical, cultural, and literary background of the Bible, your understanding will become more accurate and refined." },
      { type: "p", html: "The amazing truth is that God works incarnationally. He is with us and deeply and intimately involved in our everyday life. That is why interpretation in this method is interested in discovering the original setting. God was there in the midst of real people in real history, dealing with real life." },
      { type: "p", html: "The more we know about how God was with them, the more significant the next step becomes." },

      { type: "h2", text: "3. Application — \u201CHow does this change me?\u201D" },
      { type: "p", html: "The last step is to bring it home personally. The question to answer is: “So what?”" },
      { type: "ul", items: [
        "What truth should I believe more deeply?",
        "What sin or attitude do I need to repent of?",
        "What action, prayer, or habit should I adopt?",
        "How can this help me love God and others better?",
      ] },
      { type: "p", html: "Application may mean changing your thinking, correcting an attitude, trusting a promise, confessing sin, making a decision, or obeying a command. This step turns biblical understanding into a response of faith and obedience. God who was with His people in the past is the same God “who works in you, both to will and to work for his good pleasure” (Philippians 2:13, ESV)." },

      { type: "h2", text: "Getting Started" },
      { type: "p", html: "This method keeps things simple yet deep. It’s perfect for daily quiet times, journaling, or group studies. Start with a short passage (a Psalm, a chapter in Philippians, or James 1), pray for the Holy Spirit’s guidance, and watch how God’s Word comes alive." },
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
    title: "Topical Bible Study",
    description:
      "Learn to study a Bible topic in context: gather related passages, observe, interpret, summarize, and apply Scripture faithfully to your life.",
    blocks: [
      { type: "p", html: "A topical study asks what the whole Bible teaches about one subject. Instead of staying in one chapter, you gather the passages that speak to one topic — prayer, forgiveness, fear, generosity, marriage, the love of God. By gathering and examining passages that address the same subject, you can begin to recognize recurring themes, biblical principles, and patterns in how God instructs His people. A topical Bible study is especially useful when you have a real-life question, are facing a particular situation, or want to grow in a specific area of your Christian life." },
      { type: "p", html: "However, a topical list of verses is the starting point for understanding and not the final authority for establishing doctrine. Individual verses can be misunderstood when separated from their literary, historical, and theological contexts. Some passages may address different circumstances or emphasize different aspects of a subject. Simply collecting verses that appear to support a particular conclusion can lead to a distorted understanding of what God actually says about the topic." },
      { type: "p", html: "Sound biblical understanding requires more than gathering verses on a topic and piecing them together. It involves examining each passage in its original context, considering how it relates to the rest of Scripture, and paying attention to the overall message of the Bible. A topical study helps you discover what Bible verses say about a particular subject, while careful interpretation helps you understand what those passages actually mean." },
      { type: "p", html: "The goal is not merely to find verses that answer the questions you have on a topic, but to allow the whole counsel of God’s Word to shape our thinking, correct our assumptions, and guide our lives." },

      { type: "h2", text: "1. Choose your topic" },
      { type: "p", html: "Pick something you are curious about, struggling with, or want to understand better (for example, “patience,” “worry,” or “friendship”). Start narrow. A broad topic like “love” will overwhelm a first study." },

      { type: "h2", text: "2. Gather related verses" },
      { type: "p", html: "Start by searching for your topic or keyword in the Bible. Then look for related words and phrases that may express the same idea. Before adding a verse to your list, read the surrounding paragraph to understand its context. Do not use a verse to support a point until you understand what it means in its original setting. Gather 10–20 relevant verses for your initial study. Once you have examined them and identified the main themes and patterns, expand your search if needed." },
      { type: "ul", items: [
        "Search keywords in apps and sites like Bible Gateway, Blue Letter Bible, YouVersion, or OpenBible.info/topics.",
        "Look up synonyms or related words (for example, to search related words for “forgiveness,” try “forgive,” “pardon,” “mercy”).",
        "Check topical resources like Nave's Topical Bible or Torrey's Topical Textbook (free on Bible Hub or StudyLight.org).",
      ] },

      { type: "h2", text: "3. Read and observe each passage" },
      { type: "p", html: "Observation asks: “What does the passage actually say?” Don’t explain it yet or decide what you think it means. First, pay close attention to the words and ideas in the passage. Often, observation means simply repeating or restating what the passage says in your own words." },
      { type: "ul", items: [
        "What does the passage actually say about the topic?",
        "Who is speaking, to whom, and in what situation?",
        "What is happening in the passage?",
        "Are there any commands, promises, examples, warnings, or reasons given?",
        "Are there words or ideas that are repeated or emphasized?",
      ] },
      { type: "p", html: "Read the passage in its paragraph or surrounding context, not as an isolated verse. Your goal at this stage is to see what is there before deciding what it means." },

      { type: "h2", text: "4. Interpret and organize" },
      { type: "p", html: "Interpretation asks, “What does this passage mean in its context?” Compare passages and note how they agree. Group similar ideas together (for example, God’s forgiveness of us versus our forgiving others). Look for what they emphasize most. Notice where passages complement one another." },
      { type: "p", html: "Let clearer passages interpret less-clear ones. If two passages seem to disagree, leave them in tension for now. The goal is not to make every verse say the same thing, but to understand each passage accurately and see how the passages fit together. When they don’t all agree, God has reasons." },

      { type: "h2", text: "5. Summarize the big idea" },
      { type: "p", html: "Now, step back and ask: “What does the Bible, taken together, teach about this topic?”" },
      { type: "p", html: "Write your answer in one clear sentence or a few short sentences if necessary. Include the key truths and maintain the balance Scripture actually gives. Does this point us to God’s character, His work, or to Jesus? Keep in mind, however, that not every passage or topic points to the Lord in a direct or immediate way. Scripture also teaches us about human nature, history, evil, suffering, relationships, and spiritual realities. Do not force a reference to God or Jesus into every study simply to make it seem more spiritual. Faithful Bible study is drawing the truth out of Scripture and not reading our ideas into it." },

      { type: "h2", text: "6. Apply it personally" },
      { type: "p", html: "Finally and most importantly ask, “Because this is true, what should change in me?”" },
      { type: "p", html: "Pray and ask God to show you how this truth should affect your thinking, attitudes, choices, relationships, and actions. Move from a general truth to a specific response. For example: “Because God commands me to forgive, I will choose to release my resentment toward ______ and pray for that person.”" },
      { type: "ul", items: [
        "What should I believe?",
        "What attitude should I change?",
        "What should I start or stop doing?",
        "Is there a command I need to obey?",
        "Is there a promise I need to trust?",
        "Is there something I need to confess or make right?",
      ] },
      { type: "p", html: "Where Scripture commands, obey. Where it promises, trust. Where it warns, do not ignore it." },

      { type: "h2", text: "A Flexible, Powerful Tool" },
      { type: "p", html: "The goal is not simply to know more about what the Bible says about the topics of your interest, but to let God’s Word give you His perspective on them and let it shape the way you live." },
    ],
  },
  {
    id: "bible-recap",
    title: "Bible R.E.C.A.P.",
    description:
      "R.E.C.A.P. — Revelation, Example, Command, Application, Promise — five questions that help you hear the Holy Spirit and obey God's Word every time you read.",
    blocks: [
      { type: "p", html: '<a href="https://follow.jesusonline.com/bible/John/1" target="_blank" rel="noopener noreferrer">Read the NET Bible on JO Follow</a> and use the R.E.C.A.P. questions as you study.' },
      { type: "quote", html: "All Scripture is inspired by God and is useful to teach us what is true and to make us realize what is wrong in our lives. It corrects us when we are wrong and teaches us to do what is right. God uses it to prepare and equip his people to do every good work.", cite: "2 Timothy 3:16\u201317 (NLT)" },
      { type: "p", html: "When you renew your mind with the truth of God’s Word and follow what it says, you become more like Christ. The Word of God is the language of the Holy Spirit. He will open your mind to understand it and give you power to obey it. Whenever you read, ask the Holy Spirit to guide you into all truth (John 16:13). Then trust His guidance and ask one or more of these five questions." },

      { type: "h2", text: "Five Questions to Ask" },
      { type: "ul", items: [
        "<strong>R</strong> — Is there a <strong>REVELATION</strong> about God that I should embrace?<br /><em>Revelation is who God is. Highlight: orange.</em>",
        "<strong>E</strong> — Is there an <strong>EXAMPLE</strong> I should follow or avoid?<br /><em>Highlight: light blue.</em>",
        "<strong>C</strong> — Is there a <strong>COMMAND</strong> I should obey?<br /><em>Highlight: red.</em>",
        "<strong>A</strong> — Is there something I need to <strong>APPLY</strong> to my life?<br /><em>Application is what this passage asks of you that is not already a command, an example, or a promise. Highlight: green.</em>",
        "<strong>P</strong> — Is there a <strong>PROMISE</strong> I should claim?<br /><em>Highlight: purple.</em>",
      ] },
      { type: "p", html: "You do not have to force all five. One clear answer is enough. Some verses do not fit any of them." },

      { type: "h2", text: "An Example" },
      { type: "p", html: "John 3:16 reveals God’s love in giving His Son, so you can highlight the verse with orange (Revelation). John 13:15 is an example to follow; Judas in the same chapter is an example to avoid, so you can highlight those verses with light blue (Example). John 13:34 is a command to love one another, so you can highlight the verse with red (Command). John 15:5 asks you to abide, because apart from Him you can do nothing, so you can highlight the verse with green (Application). John 14:21 is a promise that Jesus will manifest Himself to those who love and obey Him, so you can highlight the verse with purple (Promise)." },
      { type: "p", html: "Identifying by the letter is what matters. Using color is optional. Mark the passage with a letter—R, E, C, A, or P— so you can find it again in your notes." },

      { type: "h2", text: "Treasure Them in Your Heart" },
      { type: "p", html: "Write down what you have discovered from the reading and your reflection. Thank Him for His revelations, examples, commands, applications, and promises that are to mature your new identity in Christ and make you fruitful in the good works He prepared for you. Treasure them in your heart and put them into practice." },
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
