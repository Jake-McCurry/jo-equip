/**
 * Long-form articles for the "Become a Growing Church" sub-topic
 * (/channels/church/become-growing-church/<articleId>).
 *
 * Content is stored as a sequence of typed blocks (`p`, `h2`, `h3`, `ul`,
 * `ol`, `quote`) so the article page can render them generically without
 * pulling in a markdown parser. Paragraph and list-item strings may
 * contain inline HTML (<strong>, <em>, <a>) — they are rendered with
 * `set:html` in the page component, so keep them author-controlled.
 *
 * To add a new article: append an entry here, then set the matching
 * `articleId` on the corresponding SubTopicItem in `channels.ts`. The
 * dynamic route picks it up automatically — no other wiring needed.
 */

export type ArticleBlock =
  | { type: "p"; html: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "quote"; html: string; cite?: string }
  /* Inline illustration. `src` is the basename of a file in src/assets/bcg/
     (resolved via bcgImages.ts). `alt` is required for a11y/SEO. `caption`
     is optional and renders as a muted <figcaption>. */
  | { type: "figure"; src: string; alt: string; caption?: string };

export interface BcgArticle {
  id: string;
  /** Full display title (page <h1>). */
  title: string;
  /** ~155-char SEO meta description + social card subtitle. */
  description: string;
  blocks: ArticleBlock[];
  /**
   * When true, the article is excluded from the BCG prev/next navigation
   * sequence — no other article links to it via "Next Article", and its own
   * page shows no next CTA. The page is still generated; it is reachable only
   * via inline links from other articles (e.g. Anatomy of Obedience is linked
   * from the Total Life Discipleship article).
   */
  unlisted?: boolean;
}

const REGISTER_CTA: ArticleBlock = {
  type: "p",
  html: '<strong>Register today to become a FREE JesusOnline EQUIPPED Church.</strong> <a href="/newsletter">Sign up for updates →</a>',
};

/* The "Free JesusOnline Watch → Learn → Live Resources" pitch repeats
   verbatim across several articles, so it's defined once and spread in. */
const WLL: ArticleBlock[] = [
  { type: "h2", text: "Free JesusOnline Watch → Learn → Live Resources" },
  { type: "p", html: "<strong>Capture attention immediately</strong> with a powerful video clip to introduce your message. A well-chosen video sets the emotional tone, illustrates the theme, and draws people in from the very first moment." },
  { type: "p", html: "<strong>Deepen your content</strong> by weaving key insights from the article into your teaching. Use it as rich resource material to add credibility, fresh perspectives, and biblical connections to your sermon." },
  { type: "p", html: "<strong>Drive lasting impact</strong> by sharing the app link at the end of your message. This simple tool helps your people review, remember, and apply the core essence of the sermon long after they leave the service." },
];

export const bcgArticles: BcgArticle[] = [
  {
    id: "gods-unique-vision-for-your-church",
    title: "A Unique Vision for Kingdom-Focused Growth",
    description:
      "Faithful pastor or small-group leader not seeing growth? JesusOnline offers free media and discipleship resources to help you grow deep — and God will grow you wide.",
    blocks: [
      { type: "figure", src: "bgc1-1", alt: "Opening illustration for A Unique Vision for Kingdom-Focused Growth — a faithful shepherd and the flock God has entrusted to him." },

      { type: "p", html: "You are a pastor, a small-group leader, or an elder of a congregation. You have been faithful to the Great Shepherd, feeding and shepherding His sheep. Yet you are not seeing the growth and vitality you long for." },
      { type: "p", html: "JesusOnline is here to help." },
      { type: "p", html: "We provide high-quality free media and discipleship resources designed to help you equip the people God has already entrusted to you — so they can fully participate in the missions and ministries for which God designed them." },
      { type: "figure", src: "bgc1-2", alt: "JesusOnline’s free media and discipleship resources — practical tools to help pastors feed and shepherd their flock." },

      { type: "h2", text: "Our Core Philosophy" },
      { type: "p", html: "<strong>Grow deep, and God will grow you wide.</strong>" },
      { type: "p", html: "We believe real success in God’s Kingdom is measured first by depth (maturity), not by width (numbers). When disciples are rooted in Christ, transformed by His Word, and equipped to follow Him daily, healthy growth follows naturally. Healthy sheep reproduce. Healthy flocks multiply." },

      { type: "p", html: "That’s why our resources focus on:" },
      { type: "ul", items: [
        "Biblical teaching that builds mature believers",
        "Engaging media that makes truth accessible and life-changing",
        "Practical discipleship tools that help your people thrive right where God has planted them",
      ]},

      { type: "p", html: "We are confident that when you minister God’s way — equipping saints toward Kingdom maturity to more fully and fruitfully participate in God’s mission — He is faithful to bless the work of your hands." },
      { type: "p", html: "Isn’t it reasonable to expect that if you pour yourself into faithful, biblical ministry, the Lord of the Harvest will bring the increase in His perfect timing? After all, making disciples of all nations is His mandate (Matthew 28:19), spiritual multiplication is His strategy (2 Timothy 2:2), and you are His coworker (1 Corinthians 3:9)." },
      { type: "figure", src: "bgc1-3", alt: "The Lord of the Harvest brings the increase in His perfect timing." },

      { type: "h2", text: "Let’s Build Christ’s Kingdom Together" },
      { type: "p", html: "If you are a disciple-maker — whether in formal ministry or through informal relationships — and you’re passionate about transformation that results in eternal impact, we’d love to partner with you." },
      { type: "p", html: "To become any of the churches described in this series is not a program but a process. It involves discipleship, because it requires the changing of individual hearts and the culture of the church by the power of the Holy Spirit." },
      { type: "p", html: "It is human nature to look at what we consider a successful church or group and try to imitate what they do. While it is wise to learn from one another — and there is certainly a valid strategy in multiplying churches and groups that share common characteristics — God has created your fellowship to be unique." },
      { type: "p", html: "Just as He has filled the earth with a wide variety of flowers, trees, and birds, He desires His people to reach every segment of society in their own distinct way. Simply copying other churches or groups because you want to be like them will not fulfill the God-given identity and mission of your fellowship." },
      { type: "figure", src: "bgc1-4", alt: "Partnering with pastors and church leaders to strengthen and equip the flock God has entrusted to them." },

      { type: "p", html: "Whether you’re discipling one person or leading discipleship for an entire church — whether you lead a small group or pastor many churches — your labor is a critical element in His plan to advance His Kingdom on earth. Let us help you better equip God’s people for the good works He has prepared for them (Ephesians 2:10)." },

      { type: "h2", text: "Growing Church Models" },
      { type: "p", html: "Definitions of the church vary, and there are many rich traditions and expressions. In this series of articles, when we use the word “church,” we mean a local gathering of believers called out to be sent out by Jesus. The church is functionally a fellowship — a community on God’s mission." },
      { type: "p", html: "Therefore, the principles and approaches discussed in these church models apply not only to local congregations but also to home churches and to both formal and informal small groups." },

      { type: "h2", text: "Ready to go deeper?" },
      { type: "p", html: "Explore the articles below to see how JesusOnline can help your church become:" },
      { type: "ul", items: [
        '<a href="/channels/church/become-growing-church/a-jesusonline-equipped-church">A JesusOnline EQUIPPED Church</a>',
        '<a href="/channels/church/become-growing-church/a-total-life-discipleship-church">A Total Life Discipleship Church</a>',
        '<a href="/channels/church/become-growing-church/a-transformational-teaching-church">A Transformational Teaching Church</a>',
        '<a href="/channels/church/become-growing-church/a-spirit-dependent-church">A Spirit-dependent Church</a>',
        '<a href="/channels/church/become-growing-church/a-hope-filled-church">A Hope-filled Church</a>',
        '<a href="/channels/church/become-growing-church/a-love-demonstrating-relational-church">A Love-demonstrating Relational Church</a>',
        '<a href="/channels/church/become-growing-church/an-intentional-worship-church">An Intentional Worship Church</a>',
        '<a href="/channels/church/become-growing-church/a-great-commission-church">A Great Commission Church</a>',
        '<a href="/channels/church/become-growing-church/an-online-outreach-church">An Online Outreach Church</a>',
        '<a href="/channels/church/become-growing-church/an-attractive-and-inviting-church">An Attractive and Inviting Church</a>',
        "A Model / Example Church",
      ]},

      { type: "p", html: "Discover practical, biblical resources created specifically to help churches like yours flourish right where God has planted you." },
      REGISTER_CTA,
      { type: "figure", src: "bgc1-5", alt: "Become a free JesusOnline EQUIPPED Church — closing call to register and partner together." },
    ],
  },

  {
    id: "a-jesusonline-equipped-church",
    title: "A JesusOnline EQUIPPED Church",
    description:
      "Small-church pastors wear many hats with little support. JesusOnline’s free Watch → Learn → Live resources help you save prep time, engage your people, and deepen retention.",
    blocks: [
      { type: "figure", src: "bgc2-1", alt: "Opening illustration for A JesusOnline EQUIPPED Church — the many hats a small-church pastor wears." },

      { type: "p", html: "If you are a pastor or leader of a small church, you carry a unique load of responsibilities. You wear multiple hats every single week, often with limited resources and little to no staff support. You may even work at another job just to make ends meet — while still being expected to preach, counsel, visit, lead, and manage the church." },
      { type: "p", html: "You’re frequently swamped with day-to-day survival tasks, leaving little time or energy for the bigger vision God has given you. On top of that, attempts to try new things are sometimes met with resistance from well-meaning members who prefer to keep doing things “the way we’ve always done them.” Reaching new generations and adapting to cultural shifts can feel nearly impossible." },
      { type: "figure", src: "bgc2-2", alt: "The weight of small-church ministry — survival tasks, resistance to change, and the challenge of reaching new generations." },

      { type: "p", html: "JesusOnline is here to come alongside you. And there are no fees or hidden costs. What we offer is totally free." },
      { type: "p", html: "We don’t offer trendy church-growth formulas or worldly success strategies. Instead, we provide high-quality, free media and discipleship resources created specifically to help you faithfully equip the flock God has entrusted to you." },
      { type: "figure", src: "bgc2-3", alt: "Totally free, high-quality media and discipleship resources for the local church." },

      { type: "p", html: "<strong>JO EQUIP</strong> is a free digital library of practical discipleship tools for pastors and disciple-makers — carefully organized into three mission-driven channels so you can find exactly what you need, when you need it." },
      { type: "p", html: "JesusOnline offers free <em>Watch → Learn → Live</em> resources to strengthen engagement, depth, and retention in your ministry. You can use them for your Sunday message, your Bible study, or your discipleship ministry." },
      { type: "figure", src: "bgc2-4", alt: "The Watch → Learn → Live model — short videos, deeper teaching articles, and practical life application." },

      { type: "h2", text: "Sunday Messages" },
      { type: "p", html: "We believe the primary purpose of Sunday messages is “teaching them to obey everything I have commanded you” (Matthew 28:20)." },

      { type: "h3", text: "A Simple 5-Step Process You Can Use This Sunday" },
      { type: "ol", items: [
        "<strong>Select a Topic.</strong> Browse the JO EQUIP library and choose a topic that fits your upcoming message (from the Evidence, Growth, or Church channels).",
        "<strong>Build Your Message.</strong> Use the article as your skeleton outline or rich resource material. Develop the key truths with your own illustrations, personal stories, pastoral insights, and relevant examples from your congregation. The content is biblical, trustworthy, and ready to save you hours of preparation.",
        "<strong>Capture Attention Immediately.</strong> Play the summary video at the very beginning of your message. It sets the emotional tone, gives people a clear preview of where you’re going, and draws in even distracted or first-time visitors.",
        "<strong>Deliver Your Teaching.</strong> Preach with freedom and confidence, knowing the core content is solid and well-researched.",
        "<strong>Extend the Impact Beyond Sunday.</strong> At the end of your message, share a specific link (or QR code) from the JesusOnline app that takes people directly to the article and related resources you used. They can now review the main points, reflect deeper, answer discussion questions, and apply the truth — all on their phones. It becomes their personal takeaway notes and discipleship tool for the week.",
      ]},
      { type: "figure", src: "bgc2-5", alt: "The 5-step process: Select → Build → Capture → Deliver → Extend — turning one sermon into an ongoing discipleship experience." },

      { type: "h3", text: "Why Pastors Love This Approach" },
      { type: "ul", items: [
        "Saves significant preparation time",
        "Provides high-quality, biblically faithful, transformational content",
        "Increases engagement during the service",
        "Dramatically improves retention and real-life application",
        "Turns one sermon into an ongoing discipleship experience",
      ]},
      { type: "figure", src: "bgc2-6", alt: "Why pastors love this approach — saved prep time, deeper engagement, and lasting retention." },

      { type: "h2", text: "Bible Study" },
      { type: "p", html: "You can use our Bible study series or create your own using our materials." },
      { type: "h3", text: "A Simple 2-Step Process to Create a Bible Study" },
      { type: "ol", items: [
        "<strong>Select a Bible study series.</strong> Bible study series are found on the JO EQUIP Growth channel.",
        "<strong>Develop new habits.</strong> We believe the main goal of Bible study is life transformation through practice. End each study by creating a simple action plan to apply the truths learned — then begin the next meeting by sharing how people put the plan into practice.",
      ]},
      { type: "p", html: "<strong>Optional: create your own Bible studies.</strong> The JesusOnline app library offers hundreds of articles and many article series. You’ll find some of them useful as the basis for a Bible study, and you can turn any article into a stand-alone study." },

      { type: "h2", text: "Discipleship Ministry" },
      { type: "p", html: "Our resource materials in the Church channel are both Spirit-led and strategically organized to help you strengthen your ministry." },
      { type: "p", html: 'If you’d like to develop or improve your discipleship ministry, we offer free coaching — just <a href="mailto:equip@jesusonline.com">email us at equip@jesusonline.com</a> for more information.' },

      { type: "p", html: "All resources are completely free, mobile-friendly, and thoughtfully created with the real challenges of small-church ministry in mind." },
      { type: "p", html: "All we ask in return is that you identify your church as a JesusOnline EQUIPPED church. This simple acknowledgment lets you freely use our videos, articles, and app links with our full permission. When people see the JesusOnline logo at the end of a video — or notice the resources you’re sharing — they’ll know you’re part of this ministry partnership." },
      { type: "p", html: 'Ready to get started? Visit <a href="/">JO EQUIP</a> today and explore the channels. We’d love to partner with you. Let’s build Christ’s kingdom together — one faithful church at a time.' },
      REGISTER_CTA,
      { type: "figure", src: "bgc2-7", alt: "Closing illustration — partnering together to build Christ’s kingdom." },
    ],
  },

  {
    id: "a-total-life-discipleship-church",
    title: "A Total Life Discipleship Church",
    description:
      "JesusOnline’s philosophy of discipleship — a grace-filled, Spirit-dependent journey from God’s vision of us, to personal transformation, to eternal impact, sustained by five pillars.",
    blocks: [
      { type: "quote", html: "Teach these new disciples to obey all the commands I have given you. …", cite: "Matthew 28:20, NLT" },
      { type: "figure", src: "bgc3-1", alt: "The Great Commission — making disciples who obey all that Jesus commanded." },

      { type: "p", html: "<em>Total Life Discipleship</em> refers to JesusOnline’s philosophy and approach to Christian discipleship." },
      { type: "p", html: "Christian discipleship is a lifelong journey of becoming more like Jesus in every way, so as to expand His Kingdom on earth as it is in heaven. Jesus is our Master Teacher. This journey is faith-driven and action-oriented (cf. Matthew 25:14–30; Luke 19:11–27), and it is measured by obedience (read more in <a href=\"/channels/church/become-growing-church/anatomy-of-obedience\">Anatomy of Obedience</a>). Its goal is far loftier, and its scope far greater, than our individual spiritual growth and change." },
      { type: "p", html: "Total Life Discipleship begins with God’s vision of us, leads to personal transformation into the likeness of Christ, and flows outward into eternal impact for His kingdom. It is a grace-filled journey that invites every believer to align their entire existence with God’s eternal purposes. At its core, this discipleship is relationship-centered, grace-based, Spirit-dependent, love-motivated, and biblically focused — five pillars that keep our walk with the Lord both authentic and fruitful." },

      { type: "h2", text: "God’s Vision: Seeing Life from His Perspective" },
      { type: "p", html: "Every journey of discipleship must begin where God begins — with His loving vision of us." },
      { type: "p", html: "Our heavenly Father sees not our failures or frailties but the finished work of His Son. <em>“Anyone who belongs to Christ has become a new person. The old life is gone; a new life has begun!”</em> (2 Corinthians 5:17, NLT)." },
      { type: "p", html: "He knit each of us together with intentional care (Psalm 139:13–14). Our personalities, strengths, and even our weaknesses serve His design. Before we drew our first breath, He set us apart for kingdom purposes (Jeremiah 1:5). When we rest in His unwavering love — <em>“Abide in My love”</em> (John 15:9) — circumstances lose their power to define us. We begin to view ourselves, others, and our daily paths through the clarifying light of His truth." },
      { type: "p", html: "This inspiring vision is foundational to obedience. It renews our minds with God’s perspective, replacing worldly lies with biblical truth and grounding every command in His fatherly care." },
      { type: "figure", src: "bgc3-5", alt: "The grace-filled journey of Total Life Discipleship — God’s vision, personal transformation, and eternal impact." },

      { type: "h2", text: "Personal Transformation: Becoming the Person God Created You to Be" },
      { type: "p", html: "God’s vision is meant to be lived out. Transformation begins at the moment of salvation, when our old identity is exchanged for a new one in Christ (Ephesians 4:21–24). Yet this new life must be nurtured to maturity as a lifelong process of renewal by the Holy Spirit." },
      { type: "p", html: "Experiential knowledge of grace stirs holy desires, and gratitude for Christ’s sacrifice shifts obedience from a burdensome duty to a joyful response of love." },
      { type: "p", html: "True change touches the core of our character — our values, convictions, and responses. <em>“Let God transform you into a new person by changing the way you think”</em> (Romans 12:2, NLT). Trials refine us, building endurance and trust so that we reflect more of Christ’s nature (Romans 5:3–4; 8:28). As we comprehend the breadth, length, depth, and height of God’s love, we are filled with His fullness (Ephesians 3:17–19). Love received becomes love reflected." },

      { type: "h2", text: "Eternal Impact: Pursuing God’s Master Plan" },
      { type: "p", html: "A life transformed by God naturally bears lasting fruit. We were created <em>“to do the good things He planned for us long ago”</em> (Ephesians 2:10, NLT). Our days are not accidental; God has placed us in this generation with specific gifts, experiences, and relationships to advance His kingdom." },
      { type: "p", html: "Eternal impact flows from obedient partnership with the Lord — dependent on the Holy Spirit rather than obstinate self-effort. <em>“I can do all things through Christ who gives me strength”</em> (Philippians 4:13). We steward time, talent, and treasure for heaven’s sake, investing in what matters to God and storing up treasures that never fade (Matthew 6:21)." },

      { type: "h2", text: "The Five Pillars That Sustain the Journey" },
      { type: "figure", src: "bgc3-6", alt: "The five pillars of Total Life Discipleship — relationship-centered, grace-based, Spirit-dependent, love-motivated, biblically focused." },
      { type: "p", html: "Total Life Discipleship stands firmly on truths that guard our hearts and direct our steps:" },
      { type: "ul", items: [
        "<strong>Relationship-centered:</strong> Prioritizing intimacy with God above all, then with believers and others.",
        "<strong>Grace-based:</strong> Receiving God’s unearned favor rather than striving to earn it.",
        "<strong>Spirit-dependent:</strong> Relying on the Holy Spirit’s power instead of self-effort.",
        "<strong>Love-motivated:</strong> Being filled with God’s unconditional love and allowing it to flow through us to others.",
        "<strong>Biblically-focused:</strong> Renewing our mind with Scripture to adopt God’s perspective, replacing worldly viewpoints and values.",
      ]},
      { type: "p", html: "These pillars keep discipleship balanced, preventing both burnout and complacency. They ensure that exhortation stirs the heart while teaching equips the hands, producing disciples who obey all that Jesus commanded." },

      { type: "h2", text: "A Daily Invitation to Walk with Christ" },
      { type: "p", html: "Total Life Discipleship is not a program to complete but a daily invitation to walk intimately with the One who formed you, redeemed you, and calls you by name. As you behold His vision, yield to His transforming work, and step faithfully into His purposes, your life of eternal significance will one day receive the Lord’s approval: <em>“Well done, good and faithful servant”</em> (Matthew 25:21, NKJV)." },

      ...WLL,
      { type: "h3", text: "Total Life Discipleship" },
      { type: "ul", items: [
        '<a href="/channels/church/total-life-discipleship-principles">Part 1: Core Principles</a> (PDF • Video • App)',
        "Part 2: Kingdom Perspective (PDF • Video • App)",
        '<a href="/channels/growth/building-blocks">Part 3: Building Blocks for Maturity</a> (PDF • Video • App)',
      ]},

      REGISTER_CTA,
      { type: "figure", src: "bgc3-7", alt: "A daily invitation to walk closely with Christ — closing illustration." },
    ],
  },

  {
    id: "anatomy-of-obedience",
    title: "Anatomy of Obedience",
    // Supporting article: excluded from the BCG list + prev/next nav; reachable
    // only via the inline link inside the Total Life Discipleship article.
    unlisted: true,
    description:
      "Why does obedience matter if we are saved by grace? The anatomy of biblical obedience — knowledge, motivation, and methodology — and how healthy discipleship balances all three.",
    blocks: [
      { type: "quote", html: "Therefore go and make disciples of all nations, baptizing them in the name of the Father and the Son and the Holy Spirit, teaching them to obey everything I have commanded you. And remember, I am with you always, to the end of the age.", cite: "Matthew 28:19–20" },
      { type: "p", html: "Jesus’ final charge in the Great Commission calls the church to make disciples who obey all that He commanded. This mission raises honest questions for every believer: If salvation is by grace through faith and not by works, why does obedience matter? How do we move beyond inspiration and instruction to actual transformation? And how can we live out this obedience in every sphere of life?" },

      { type: "h2", text: "Saved by Grace, Formed for Obedience" },
      { type: "figure", src: "bgc3-2", alt: "Saved by grace, formed for obedience — Ephesians 2:8–10." },
      { type: "p", html: "Scripture settles the tension between grace and obedience with beautiful clarity. Ephesians 2:8–10 reminds us:" },
      { type: "quote", html: "God saved you by his grace when you believed… Salvation is not a reward for the good things we have done… For we are God’s masterpiece. He has created us anew in Christ Jesus, so we can do the good things he planned for us long ago." },
      { type: "p", html: "We are saved by grace alone, through faith alone. Nothing we do earns or maintains this gift. Yet the same passage declares that we are saved <em>for</em> good works. Obedience is not the root of salvation; it is the natural fruit of a life made new in Christ. Genuine faith produces change (James 2:14–26), and love for Jesus is expressed by keeping His commands (John 14:15). Biblical obedience is an act of faith in Christ." },
      { type: "p", html: "However, obedience is not the goal of the Christian life. It is the means by which we live the abundant life Jesus promised, experience God’s presence, participate in His mission, and fulfill the eternal purposes for which we were redeemed. Obedience is the path to Kingdom maturity — to becoming <em>“a mature person, attaining to the measure of Christ’s full stature”</em> (Ephesians 4:13)." },

      { type: "h2", text: "The Three Essentials of Obedience" },
      { type: "figure", src: "bgc3-3", alt: "The three essentials of obedience — Knowledge, Motivation, and Methodology." },
      { type: "p", html: "We often fail to obey because one or more of the following are not adequately addressed:" },

      { type: "h3", text: "1. Knowledge — Do I know what Jesus actually commanded?" },
      { type: "p", html: "You cannot obey what you do not know. Jesus directs us to learn to obey everything He has commanded. These topics cover all aspects of daily life: God, His Kingdom, our identity in Christ, purpose in life, family, relationships, work, money, sex, health, education, government, love, forgiveness, prayer, the church, and more." },

      { type: "h3", text: "2. Motivation — Do I desire to obey?" },
      { type: "p", html: "Informational knowledge is not enough. The heart must want to follow. God’s character, Christ’s sacrifice and love, our new identity in Christ, the Holy Spirit within us, and the Kingdom of God all move our new hearts to deeper devotional love and desire (Ezekiel 36:26–27; 2 Corinthians 5:14)." },

      { type: "h3", text: "3. Methodology — Do I know how to obey?" },
      { type: "p", html: "The Bible gives us both descriptive examples and prescriptive instructions for how to live out God’s truths in everyday life. When we are born again, we are spiritual babies. We are no longer of this world, and the ways of this world no longer apply. We must receive clear Kingdom instructions to live as citizens of His Kingdom." },

      { type: "h2", text: "Exhortation and Teaching" },
      { type: "figure", src: "bgc3-4", alt: "Exhortation versus teaching — stirring the heart and equipping the hands." },
      { type: "p", html: "Jesus and the apostles addressed all three essentials. Paul’s letters usually begin with deep doctrinal truths — building knowledge and motivation. Then, with a pivotal <em>“therefore,”</em> he transitions and explains at length how to live (methodology)." },
      { type: "p", html: "Much modern preaching leans heavily on exhortation — passionate calls to “obey God!” or “step out in faith!” These feel urgent and emotionally powerful, but without clear teaching on method, listeners leave motivated yet unequipped. They know they should forgive, pray, or resist sin — but not <em>how</em>, when the pain is fresh or the habit is entrenched. The result is repeated frustration and, eventually, cynicism." },
      { type: "p", html: "Discipleship is measured by obedience. Healthy discipleship balances all three essentials: clear knowledge of the command, gospel motivation rooted in grace, and practical steps for daily life." },

      REGISTER_CTA,
    ],
  },

  {
    id: "a-transformational-teaching-church",
    title: "A Transformational Teaching Church",
    description:
      "Three complementary dimensions of teaching — head, hands, and heart — and the three core truths that produce irreversible heart change in the believers you shepherd.",
    blocks: [
      { type: "figure", src: "bgc4-1", alt: "Opening illustration for A Transformational Teaching Church — equipping believers through God’s Word." },

      { type: "p", html: "The first-century believers were devoted to the apostles’ teaching (Acts 2:42). As a pastor or church leader shepherding your flock, it is wise to reflect on how the Lord equips His people through His Word — calling us not only to know the truth, but to live it out and be transformed by it." },
      { type: "figure", src: "bgc4-2", alt: "Knowing the truth, living it out, and being transformed by it — the threefold call of Scripture." },
      { type: "p", html: "There are three distinct and complementary dimensions to teaching:" },

      { type: "h2", text: "1. Bible Knowledge (The Head)" },
      { type: "p", html: "This is the foundational, verse-by-verse expository teaching that builds a solid understanding of Scripture. It focuses on what the Bible says — its history, context, doctrines, and accurate interpretation. The goal is biblical literacy and doctrinal soundness so that God’s people may <em>“know the truth”</em> (John 8:32)." },

      { type: "h2", text: "2. Life Application (The Hands)" },
      { type: "p", html: "This approach draws practical principles and examples from Scripture and shows how they apply to everyday life. It answers the question, <em>How should we live?</em> It equips believers to obey God’s Word in their relationships, work, decisions, and daily challenges. This is the bridge between knowledge and action." },

      { type: "h2", text: "3. Transformation (The Heart)" },
      { type: "p", html: "This is the deepest and most vital level of biblical teaching. It moves beyond the transmission of information, or even the application of principles, to focus on the foundational core truths of the Gospel that genuinely change the heart and irreversibly transform lives." },
      { type: "p", html: "Our resources are specifically designed to strengthen this third dimension of teaching — transformation (the Heart)." },

      { type: "h2", text: "3 Core Truths" },
      { type: "p", html: "The following three truths are the essential content of teaching and the bedrock of discipleship, including Total Life Discipleship." },
      { type: "p", html: "When believers internalize these truths, the Holy Spirit produces irreversible heart change and Christlike maturity. They bring every dimension of life — thoughts, desires, habits, relationships, work, time, resources, and purpose — under the loving lordship of Jesus Christ. The result is not merely informed or active believers, but disciples who are radically transformed from the inside out (Romans 12:2; Galatians 4:19)." },
      { type: "figure", src: "bgc4-3", alt: "Three core truths — the character of God, our new identity in Christ, and the ministry of the Holy Spirit." },

      { type: "h3", text: "1. The Character and Nature of God" },
      { type: "p", html: "Our view of God’s character and attributes shapes everything else in our lives — our worship, our trust, our obedience, and our responses to trials. While God’s attributes are often mentioned in sermons, they are rarely taught as a complete, balanced whole. The result is a fragmented, sometimes distorted image of God." },
      { type: "p", html: "For example, when we elevate His love above His holiness and justice — or any other attribute at the expense of the others — we no longer see the God of Scripture. A true vision of God in all His glory (merciful yet righteous, loving yet sovereign) becomes the foundation for healthy fear of the Lord, deep worship, and transformed living." },

      { type: "h3", text: "2. Our New Identity in Christ" },
      { type: "p", html: "At the very moment a person is born again, Scripture declares that <em>“the old has passed away; behold, the new has come”</em> (2 Corinthians 5:17). In Christ, believers are no longer defined by their past or their failures. They are a brand-new creation with a new position, a new identity, and a new self-image." },
      { type: "p", html: "Yet this profound truth is seldom taught clearly. The Apostle Paul routinely addressed ordinary first-century believers as <em>“saints.”</em> When we see ourselves primarily as “sinners saved by grace,” we tend to live like sinners. But when we grasp that in God’s eyes we are now saints — righteous in Christ — holy living becomes the new normal. Sin is no longer our identity; it is an intruder to be rejected and put to death because it is foreign to who we truly are in Christ." },

      { type: "h3", text: "3. The Ministry and Power of the Holy Spirit" },
      { type: "p", html: "The Holy Spirit has been given to every believer to dwell within them, empower them, comfort them, convict them, and guide them into all truth. He is not a distant force but a personal Helper who enables us to live the Christian life as God intends." },
      { type: "p", html: "Tragically, many believers have little understanding of the Spirit’s various ministries or how to cooperate with Him daily. Without this knowledge, they are left striving in their own strength — only to experience repeated frustration, burnout, and defeat. Believers must walk by the Spirit, relying on His power and yielding to His leading moment by moment." },

      { type: "h2", text: "Head, Hands, and Heart Together" },
      { type: "p", html: "A transformational teaching church applies all three dimensions of teaching to help believers internalize the three core truths." },
      { type: "p", html: "By wholistically — head, hands, and heart — teaching God’s people on the full character of God, their new identity in Christ, and the empowering ministry of the Holy Spirit, you can help them break free from sinful habits, develop Christlike character, live in dynamic fellowship with God, and make an eternal impact right where He has placed them." },
      { type: "p", html: "This integrated approach is the very focus of what JesusOnline exists to support." },

      { type: "h2", text: "Free JesusOnline Watch → Learn → Live Resources" },
      { type: "figure", src: "bgc4-4", alt: "Free JesusOnline Watch → Learn → Live resources — short videos, deeper articles, and practical application." },
      { type: "p", html: "<strong>Capture attention immediately</strong> with a powerful video clip to introduce your message. A well-chosen video sets the emotional tone, illustrates the theme, and draws people in from the very first moment." },
      { type: "p", html: "<strong>Deepen your content</strong> by weaving key insights from the article into your teaching. Use it as rich resource material to add credibility, fresh perspectives, and biblical connections to your sermon." },
      { type: "p", html: "<strong>Drive lasting impact</strong> by sharing the app link at the end of your message. This simple tool helps your people review, remember, and apply the core essence of the sermon long after they leave the service." },

      { type: "h3", text: "From Building Blocks for Maturity" },
      { type: "ul", items: [
        '<a href="/channels/growth/building-blocks">God’s Majestic Qualities</a> (PDF • Video • App)',
        '<a href="/channels/growth/building-blocks">Your New Identity, Overview</a> (PDF • Video • App)',
        '<a href="/channels/growth/building-blocks">Walking by the Spirit</a> (PDF • Video • App)',
      ]},

      { type: "h3", text: "Recommended Resources on Amazon" },
      { type: "ul", items: [
        "<em>God: Discover His Character</em> by Bill Bright",
        "<em>Living Supernaturally in Christ</em> by Bill Bright",
        "<em>His Intimate Presence: Experiencing the Transforming Power of the Holy Spirit</em> by Bill Bright",
      ]},

      REGISTER_CTA,
    ],
  },

  {
    id: "a-spirit-dependent-church",
    title: "A Spirit-dependent Church",
    description:
      "Lasting ministry fruit comes from dependence on the Holy Spirit, not human strategy. The marks of a Spirit-dependent church — fervent prayer, Christ-centered teaching, and the fruit of the Spirit.",
    blocks: [
      { type: "p", html: "A church demonstrates dependence on the Holy Spirit when its practices, priorities, and outcomes increasingly reflect reliance on God’s power rather than human strategies, programs, or charisma alone. The results belong to God. Yet this dependence is rarely perfect; it is an ongoing journey of learning to lean on the Spirit amid weakness, failure, and the daily pressures of ministry." },

      { type: "h2", text: "Marks of a Spirit-Dependent Church" },
      { type: "p", html: "Such dependence is seen in a church that values fervent corporate prayer, regularly seeking God’s direction for decisions and plans — even when human strategies still compete for attention. It appears in biblical preaching and teaching, centered on Christ, that honestly confronts sin, calls for repentance and holiness, and leads to real, though sometimes gradual, transformation in people’s lives. Worship, though imperfect, carries moments of genuine passion and Christ-exalting focus. The church also makes room for spiritual gifts to build up the body and encourages believers to share the gospel with boldness — often in spite of fear or inadequacy." },
      { type: "p", html: "Corporate dependence grows as individual believers — with all their struggles — learn to recognize the Holy Spirit’s personal ministries and cooperate with Him more consistently. He patiently teaches truth and illuminates Scripture; helps us in prayer when words fail; keeps us moving toward holiness even when we stumble; comforts us in trials; fosters peace in broken relationships; protects us from evil; guides our decisions; and empowers our service." },
      { type: "p", html: "The clearest evidence is the growing fruit of the Spirit within the community — love, joy, peace, patience, kindness, generosity, and unity — visible not in flawless performance but in relationships that reflect grace, forgiveness, and “bearing with one another in love” through trials. Dependence on the Spirit also shows itself in the humility that admits human weakness, confesses sin quickly, and keeps returning to the Spirit for fresh filling and strength." },
      { type: "p", html: "The Christian life is not a burden of flawless performance we must carry alone. It is Christ living His life in us and through us by the power of the Holy Spirit — bringing freedom, peace, joy, and victory even in our imperfection. By God’s grace, we walk this path one day at a time, always returning to a yielded heart through confession, faith, and obedience." },

      ...WLL,
      { type: "h3", text: "Holy Spirit Resources" },
      { type: "ul", items: [
        "Walking by the Spirit (PDF • Video • App)",
        "Power for Supernatural Living (PDF • Video • App)",
        "Walk in the Spirit, a video series (PDF • Video • App)",
        "Living by the Spirit (PDF • Video • App)",
        "How to Be Filled with the Holy Spirit (PDF • Video • App)",
        "Holy Spirit, a New Life in Christ Bible study (PDF • Video • App)",
      ]},

      REGISTER_CTA,
    ],
  },

  {
    id: "a-hope-filled-church",
    title: "A Hope-filled Church",
    description:
      "Christian hope is confident expectation grounded in Christ’s resurrection. How a hope-filled church lifts eyes from earthly chaos to God’s steady presence — with five grace-centered shifts in focus.",
    blocks: [
      { type: "p", html: "A hope-filled church stands as a radiant beacon in a world often shadowed by uncertainty, offering confidence rooted in Christ’s resurrection. Without hope, people struggle with despair, isolation, and stagnation. With it, they endure hardship better and pursue growth." },
      { type: "p", html: "Christian hope isn’t vague wishful thinking — it is confident expectation grounded in God’s character, His promises, and the resurrection of Jesus. This hope transforms despair into assurance, reminding people that suffering has meaning and that God’s good and perfect purposes will be fulfilled, even amid challenges that sometimes make no sense." },
      { type: "p", html: "Instead of burdening seekers with guilt and rules, a hope-filled church looks at the world through God’s perspective and proclaims His plans for “a future and a hope” (Jeremiah 29:11). It leads people to repentance through the radiance of hope in Christ." },
      { type: "p", html: "A hope-filled church is also an instrument of the “God of hope,” equipping believers not merely to survive the challenges of life but to thrive in the abundant life Jesus promises. The church in hope witnesses to the Gospel’s strength, pursues God’s kingdom with a unified vision, and fosters a fellowship — a community on God’s mission — where faith can flourish." },
      { type: "p", html: "Hope in Christ is a powerful motivator, giving people resilience, resourcefulness, and endurance. It faithfully refreshes and replenishes the souls of those who are heavy-laden, because it helps them focus on God’s trustworthy character and His unfailing promises." },
      { type: "p", html: "Churches can nurture this hope through uplifting worship, transformational teaching, and supportive relationships (Hebrews 10:23–25). Hope is renewed by a fresh encounter with God’s truth — a biblical shift in perspective that lifts our eyes from earthly chaos to the steady light of His presence." },
      { type: "quote", html: "May the God of hope fill you with all joy and peace as you trust in him, so that you may overflow with hope by the power of the Holy Spirit.", cite: "Romans 15:13, NIV" },
      { type: "p", html: "This is the heart of a hope-filled congregation — creating an environment where God Himself fills His people, enabling them to overflow with confident expectation." },

      { type: "h2", text: "Five Grace-Centered Shifts in Focus" },
      { type: "p", html: "So how can your church guide hearts away from the turmoil of this world and toward the supernatural hope that only God provides? Consider these five grace-centered shifts in focus:" },
      { type: "ol", items: [
        "Focus on God’s majesty more than your circumstances.",
        "Focus on God’s faithfulness instead of your limited resources.",
        "Focus on today’s blessings rather than worries about tomorrow.",
        "Focus on the next step instead of trying to predict the future.",
        "Focus on God’s supernatural presence more than your adversity.",
      ]},
      { type: "p", html: "Through such intentional, Scripture-saturated guidance, a church not only sustains its members but equips them to walk as beacons of hope in their daily lives." },
      { type: "p", html: "JesusOnline stands ready as a faithful partner, offering a treasury of free resources to help your church fully embrace and reflect this hope-filled identity. These resources equip you not merely to teach, but to create weekly encounters where the God of hope moves powerfully among His people. Through them, both first-time visitors and longtime believers can experience the refreshing work described in Romans 15:13 — being filled with joy and peace as they trust in Him, overflowing with hope by the power of the Holy Spirit." },
      { type: "p", html: "In a world hungry for assurance, JesusOnline resources help transform your church into a vibrant wellspring of renewal: a place where burdens are lifted, perspectives are renewed, and hearts are continually pointed toward the living hope found in Christ alone." },

      ...WLL,
      { type: "h3", text: "Hope Resources" },
      { type: "ul", items: [
        '<a href="/channels/growth/hope-times-crisis">Hope in Times of Crisis</a> (PDF • Video • App)',
        "Bible Promises for Hope (PDF • Video • App)",
        "God Is Hope (PDF • Video • App)",
      ]},

      REGISTER_CTA,
    ],
  },

  {
    id: "a-love-demonstrating-relational-church",
    title: "A Love-demonstrating Relational Church",
    description:
      "The greatest witness to the world is the sacrificial love Christians show one another. How a relational church prioritizes depth over breadth — fueled by God’s unconditional, unstoppable, unfathomable love.",
    blocks: [
      { type: "p", html: "At its heart, the love-demonstrating relational church believes that the greatest witness to the world is not flashy services or impressive buildings, but the tangible, sacrificial love Christians show toward one another and their neighbors. Jesus Himself declared this the defining mark of His followers:" },
      { type: "quote", html: "By this everyone will know that you are my disciples, if you love one another.", cite: "John 13:35" },
      { type: "p", html: "The relational church takes this command seriously — not as a nice sentiment, but as its core operating system." },

      { type: "h2", text: "What It Looks Like in Practice" },
      { type: "p", html: "A love-demonstrating relational church prioritizes depth over breadth. Instead of chasing crowds through entertaining or trendy programs and events, it invests in small groups, mentorship, shared meals, and consistent presence in one another’s lives. Members know each other’s stories — the joys, the struggles, the messy middle — and choose to stay committed to one another anyway." },
      { type: "p", html: "It values vulnerability and authenticity. Sermons address real pain, not just polished theology. Testimonies include failures as well as victories. Leaders model transparency rather than projecting perfection, creating safety for people to bring their whole selves to the fellowship — a community on God’s mission." },
      { type: "p", html: "It practices love in action — families adopting singles and seniors, practical help in times of crisis, generous giving, and quick reconciliation when conflict arises." },
      { type: "p", html: "It is relationally outward-focused. True love is never contained within the community; by its very nature it flows outward. Members are equipped to build genuine friendships in their neighborhoods, workplaces, and schools. Evangelism flows naturally from relationships rather than programmed encounters. People are seen not as projects to be converted, but as image-bearers to be loved — whether or not they ever become part of the fellowship." },

      { type: "h2", text: "Why This Matters Now" },
      { type: "p", html: "Research continues to show rising rates of isolation, anxiety, and depression, especially among younger generations. Many have left institutional religion because it felt transactional or performative. A relational church offers a compelling alternative: belonging before believing, love before lectures, family before formality." },
      { type: "p", html: "This relational focus does not diminish the importance of preaching, worship, or biblical truth — quite the opposite. Sound doctrine and passionate worship find their richest expression when embodied in loving community." },

      { type: "h2", text: "The Transforming Power Behind It All" },
      { type: "p", html: "This “love-demonstrating” is not merely external friendliness or human love produced by self-effort. Nor does it imply moral compromise or an “anything goes” attitude. A love-demonstrating relational church taps into a source far deeper and greater: God’s love. It recognizes that His love is being poured out on, and demonstrated through, His people. His love is holy, righteous, transformational, and supernatural." },
      { type: "p", html: "It begins with God’s people being personally transformed by God’s love — unconditional, unstoppable, and unfathomable." },
      { type: "ul", items: [
        "<strong>God’s love is unconditional.</strong> He loves you because of who He is, not because of what you have or haven’t done. “But God demonstrates His own love toward us, in that while we were still sinners, Christ died for us” (Romans 5:8, NKJV).",
        "<strong>God’s love is unstoppable.</strong> No matter the circumstance, you will never be separated from the love God has for you (Romans 8:38–39).",
        "<strong>God’s love is unfathomable.</strong> God’s love for you is so vast that it surpasses anything your mind can imagine — “how wide, how long, how high, and how deep his love is” (Ephesians 3:18–19).",
      ]},
      { type: "p", html: "As 1 John 4:19 reminds us, “We love because he first loved us.”" },
      { type: "p", html: "First, people experience God’s love by beginning a genuine relationship with Him. Then, as they cultivate that relationship, they encounter His limitless, transforming love. They delight in the reality of being forever loved by God, allowing this truth to become their constant source of identity and assurance. Because they know they are unconditionally, unstoppably, and unfathomably loved, the Holy Spirit enables them to become channels of that same love. God desires His loving nature to become their nature, so that His love overflows from them to others. When people are secure in God’s forever love, that transforming love naturally touches everyone within their sphere of influence." },
      { type: "p", html: "The world desperately needs living demonstrations of the love of Christ expressed through His people, together. This vision is not about trying harder to love others. It is about being so filled with God’s love that loving others becomes the natural overflow of a transformed life." },

      ...WLL,
      { type: "h3", text: "Love Focus Resources" },
      { type: "ul", items: [
        '<a href="/channels/growth/forever-loved">Forever Loved series</a> (PDF • Video • App)',
        "Experience God’s Love playlist (PDF • Video • App)",
        '<a href="/channels/growth/days-god-s-love">40 Days of God’s Love</a> (PDF • Video • App)',
        "Timeless Love, Transforming Love (PDF • Video • App)",
        "Love Bible studies (PDF • Video • App)",
        "One Another series (PDF • Video • App)",
      ]},

      REGISTER_CTA,
    ],
  },

  {
    id: "an-intentional-worship-church",
    title: "An Intentional Worship Church",
    description:
      "Music is the language of the heart. How an intentional worship church keeps God the focal point — with four biblical song categories, a service flow, and practical ways to equip every worshipper.",
    blocks: [
      { type: "p", html: "<em>Note: This article is written primarily with churches in the Western world in mind. However, the biblical truths it presents apply to all congregations, in every cultural context. We strongly encourage you to thoughtfully adapt and apply these principles to your own local situation and culture.</em>" },

      { type: "h2", text: "Worship Through Music" },
      { type: "p", html: "Music is one of the primary ways we exalt God during corporate worship. King David identified himself as “Israel’s beloved singer of songs” (2 Samuel 23:1) and brought organized music — especially instrumental music and structured choral worship — into the formal worship of Yahweh." },
      { type: "p", html: "Music is powerful because it is the language of our hearts. It stirs the heart, unites the congregation, and lifts our collective voice toward heaven. The melody and instrumentation move and engage us, while the lyrics convey their message. So we must ask: are the words of the songs we sing acceptable in the sight of the LORD (cf. Psalm 19:14)? An intentional worship church is deliberate about selecting and singing songs that are rich in biblical truth, theologically sound, and vertically focused on God." },

      { type: "h2", text: "Core Principle: God Must Remain the Focal Point" },
      { type: "p", html: "Regardless of the style of music, the focus should always be on God — not on the song leaders or the worship band’s performance. An effective worship leader or team makes it a priority not to be the focal point." },
      { type: "ul", items: [
        "The platform is not a stage for talent; it is a place of service.",
        "Lights, sound, skill, and charisma should support the congregation’s voice, not overshadow it.",
        "The goal is not to impress people but to direct every heart toward the greatness of God.",
      ]},
      { type: "p", html: "When musicians and leaders step back — through humble posture, simple arrangements, and lyrics that keep pointing upward — the church is freed to worship in spirit and truth." },

      { type: "h2", text: "Evaluating Songs by Purpose: Four Biblical Categories" },
      { type: "p", html: "Based on its lyrics, every song has a primary purpose. Understanding this helps worship leaders build a balanced, intentional service that mirrors the flow of Scripture and the believer’s response to God. The four main categories are:" },
      { type: "ul", items: [
        "<strong>Worship songs</strong> focus on who God is — His attributes, character, and nature. They exalt His holiness, sovereignty, love, justice, mercy, wisdom, and eternity (e.g., “Holy, holy, holy is the Lord,” Isaiah 6). These songs ground the service in awe and reverence.",
        "<strong>Praise songs</strong> focus on what God does — His mighty works in creation, redemption, providence, the cross, the resurrection, and His ongoing faithfulness. They celebrate God’s actions and stir gratitude.",
        "<strong>Petition songs</strong> bring our needs before God with humble, faith-filled requests for help, strength, forgiveness, revival, or guidance. They echo the laments and prayers of the Psalms (e.g., “Lord, we need You,” “Create in me a clean heart”).",
        "<strong>Devotion songs</strong> express our response to God — surrender, love, obedience, commitment, and delight in Him (e.g., “I surrender all”). They move the heart from contemplation to consecration.",
      ]},
      { type: "p", html: "<strong>Meditation songs</strong> are usually sung as a segment within the songs above. They repeat the name of Jesus, a word, or a simple phrase, allowing people to fill their minds and hearts with God’s wonderful attributes and the beauty of Jesus — both His person and His work. They also create space to reflect in repentance, humility, or gratitude." },
      { type: "p", html: "A healthy worship set includes songs from all four categories rather than over-relying on any one. This creates theological balance and leads the congregation through a full biblical response to God." },

      { type: "h2", text: "A Suggested Service Flow" },
      { type: "p", html: "Typically, it is best to begin the service with worship and praise songs. These lift our eyes to God’s greatness and prepare hearts to receive His Word. After the sermon or message, conclude with petition and devotion songs. These allow the congregation to respond personally — asking God to apply the truth they’ve heard and recommitting their lives to Him." },
      { type: "p", html: "This flow mirrors the pattern seen in many Psalms and in historic Christian worship: adoration → thanksgiving → confession and supplication → dedication." },

      { type: "h2", text: "Music Styles" },
      { type: "p", html: "Church music spans historical, traditional, contemporary, and global expressions. They can all serve the four purposes faithfully — as long as the lyrics are biblical and the presentation keeps the attention on the Lord." },

      { type: "h2", text: "Churches with “Limited Resources”" },
      { type: "quote", html: "God is spirit, and the people who worship him must worship in spirit and in truth.", cite: "John 4:24" },
      { type: "p", html: "The Father is actively seeking such worshippers (John 4:23). This truth applies to every congregation, whether your Sunday gathering is large or small, regardless of worship style or cultural differences. In every context, each person must come ready to worship God in spirit and in truth." },
      { type: "p", html: "When we speak of churches “with limited resources,” we are not primarily referring to a lack of trained musicians, the absence of a full-time worship pastor, or having few instruments. In reality, simple resources are often more than enough: a guitar or keyboard, along with printed song sheets or projected lyrics, can powerfully facilitate heartfelt and dynamic worship. While live music is always preferable, even pre-recorded or online video music can serve effectively." },
      { type: "p", html: "Instead, “limited resources” refers mainly to unprepared believers who merely attend a worship service rather than actively participate in it. They need to be equipped to become worshippers in spirit and in truth." },
      { type: "h3", text: "Practical Ways to Equip People for Worship" },
      { type: "ul", items: [
        "Teach people, and remind them regularly, of the purpose of the service.",
        "Critically evaluate every aspect of your worship service, aligning it with two truths: worship should focus on God, and God seeks worshippers in spirit and truth.",
        "Offer a singing practice before the service — after all, the audience of our worship is God, and we come prepared to sing for Him.",
        "Offer a small-group study on worship and walk through each element of the service.",
        "Include a section on worship in your orientation or membership class.",
        "Study the Attributes of God available on the JesusOnline app.",
        "Use the “Worship” reading section on the JesusOnline app for teaching.",
      ]},

      { type: "h2", text: "Practical Guidance for an Intentional Worship Church" },
      { type: "ul", items: [
        "<strong>Theological depth and singability matter.</strong> Choose songs soaked in Scripture that the average person — from children to seniors — can sing.",
        "<strong>Leadership posture.</strong> Worship leaders should dress modestly, avoid flashy gestures, and regularly remind the church: “We are here to exalt Christ, not to perform.”",
        "<strong>Test everything.</strong> Ask: Would this song and its presentation still exalt God if the worship team were hidden? Does the arrangement help or hinder the congregation’s voice? Does the song fit one of the four biblical purposes?",
      ]},
      { type: "p", html: "When music and lyrics work together to proclaim God’s worth — with every leader and musician intentionally deflecting attention back to Him — the church is truly edified, unbelievers sense the presence of God, and Christ is magnified. In an intentional worship church, the goal of every song, every leader, and every gathering remains the same as the goal of every believer’s life: to glorify God and enjoy Him forever." },
      { type: "p", html: "This intentional approach transforms worship from a performance or a passive event into a powerful, God-centered act of ascribing worth to the One who alone is worthy." },

      REGISTER_CTA,
    ],
  },

  {
    id: "a-great-commission-church",
    title: "A Great Commission Church",
    description:
      "World evangelization is the supreme task of the church. Drawing on Oswald J. Smith’s vision, how a Great Commission church makes missions its DNA — in its preaching, its budget, and its practice.",
    blocks: [
      { type: "p", html: "Jesus’ last command to His disciples was to “go and make disciples of all nations” (Matthew 28:19). After Pentecost, His followers obediently began the process of world evangelization, known as the Great Commission." },
      { type: "p", html: "When the apostle Paul was called by Jesus to proclaim the gospel to the Gentiles, he established local churches as the primary means of accomplishing the Great Commission." },

      { type: "h2", text: "The Supreme Task of the Church" },
      { type: "p", html: "Dr. Oswald J. Smith, founding pastor of The People’s Church in Toronto, Canada, asked, “What is the supreme task of the church?” In his classic book <em>The Cry of the World</em>, he answered:" },
      { type: "quote", html: "The supreme task of the Church is the evangelization of the world. I believe that with all my heart. The most important work of the Church of Jesus Christ is world evangelization." },
      { type: "p", html: "Unfortunately, the statistics show that such Great Commission churches are few. A Great Commission church keeps its primary focus on Jesus’ mandate to make disciples of all nations — passionately advancing the Gospel and equipping believers to reach the world." },
      { type: "p", html: "When he traveled to Israel, Smith observed the stark contrast between the Sea of Galilee, teeming with life, and the Dead Sea, stagnant and lifeless. The Sea of Galilee had both an inlet and an outlet, keeping its water fresh, whereas the Dead Sea had no outlet. He writes:" },
      { type: "quote", html: "There you have a perfect illustration of the missionary church and the church that is not interested in missions. The latter takes in, but it uses everything on itself … it is filled, like a stagnant pool, with criticism, gossip, fault-finding, division and strife. The missionary church takes in, but it also gives out … it is alive and aggressive, and God’s blessing rests upon it." },

      { type: "h2", text: "Mission Must Remain the Priority" },
      { type: "p", html: "Some reason, “We must first reach our local community with the gospel, and once they’re evangelized, we can focus on reaching the world.” This is a fair point, backed by a Scriptural example. The Gospel was first proclaimed in Jerusalem, then spread to Judea, Samaria, and the rest of the Roman Empire." },
      { type: "p", html: "However, the Holy Spirit did not wait for Jerusalem to be saturated with the Gospel before sending the disciples out to Judea and Samaria (Acts 8:1). The emphasis of Acts 1:8 is that Jesus’ disciples were called to be His witnesses everywhere — both near and far. Its vision is that the concentric circles of gospel impact are to reach the entire world." },
      { type: "p", html: "Smith speaks to this issue:" },
      { type: "quote", html: "When Jesus left His disciples … He gave them but one task; namely, world evangelization … Jesus never told us to build colleges, universities, and seminaries, but we have done it … And we ought to have done it, because it is all important and worthwhile. But the one and only thing that He did tell us to do is the one and only thing that we have left undone. We have not given His Gospel to the entire world. We have not carried out His orders." },
      { type: "p", html: "Smith points out that missions should not be delegated to a small group within the church, but should be the focus of every person — beginning with the head pastor, elders, deacons, and staff. In other words, missions should not be shoved into a corner or treated as just another ministry; it should be embraced as the DNA of the entire church." },

      { type: "h2", text: "A Great Commission Church’s Budget" },
      { type: "quote", html: "Where your treasure is, there will your heart be also.", cite: "Matthew 6:21" },
      { type: "p", html: "When Dr. Smith began his ministry at The People’s Church, he was committed to aligning its budget with the vision of reaching the world for Christ. Yet his auditor revealed that the church was in debt. As Smith began communicating the Great Commission vision from the pulpit, giving increased. A few years later, 85% of the church’s annual budget was sent to support world missions; only 15% was spent on church expenses. Smith’s goal was to increase missions giving to 90% of the total budget — just the opposite of the average church, which allocates only 10–15% to missions." },

      { type: "h2", text: "How a Local Church Can Participate" },
      { type: "p", html: "So how does a local church participate in fulfilling Jesus’ Great Commission? Here are a few practical ways:" },
      { type: "ul", items: [
        "Preach on the Great Commission frequently from the pulpit.",
        "Create or support local evangelistic outreach.",
        "Send missionaries to other countries.",
        "Invite missionaries to speak during the service regularly.",
        "Add a short segment on global missions in weekly worship services.",
        "Reach out to immigrants in your community.",
        "Partner with organizations committed to world missions.",
        "Pray for the world to be reached for Christ.",
        "Equip church members in global missions (e.g., a course such as Perspectives).",
      ]},
      { type: "p", html: "Although Oswald J. Smith has gone to his reward in Heaven, he leaves behind a Great Commission–focused church that has not only reached millions for Christ but still follows his example of obedience to Jesus’ words: “Go into all the world and make disciples of all nations.”" },

      REGISTER_CTA,
    ],
  },

  {
    id: "an-online-outreach-church",
    title: "An Online Outreach Church",
    description:
      "In a digital age, an online presence is an essential extension of the Great Commission. How even small churches can reach their locality and the world online — with free JesusOnline gospel resources.",
    blocks: [
      { type: "p", html: "In our digital age, an online presence is no longer merely helpful for a church — it has become an essential extension of its calling to fulfill the Great Commission. As followers of Christ, we are commissioned to “go and make disciples of all nations” (Matthew 28:19), a mandate that transcends physical walls and embraces every available means to reach hearts with the gospel. Today, the internet stands as a vast mission field, where even modest congregations can shine." },

      { type: "h2", text: "Why It Matters Deeply for Small Churches" },
      { type: "p", html: "Many people first encounter a church not through its doors, but through a search engine, a social media post, or a streamed service. Recent data underscores this reality: roughly 89% of churches maintain some form of digital presence, and about 25 million Americans engage with church life online — either primarily or alongside in-person attendance. More than 80% of people visit a church’s website before deciding to attend in person, making a clear and welcoming online “front door” essential." },
      { type: "p", html: "For small churches, the advantages are particularly compelling. Limited seating or resources need no longer constrain outreach. A faithful online witness can:" },
      { type: "ul", items: [
        "Extend evangelism beyond Sunday mornings — reaching the unchurched, the hurting, or those in remote areas who may never initially step inside a building.",
        "Support discipleship and community, allowing members and newcomers alike to access teaching, prayer, and connection throughout the week.",
        "Fuel measurable growth. Churches with growing online engagement often see corresponding increases in in-person attendance; online views can serve as a leading indicator of vitality.",
      ]},
      { type: "p", html: "Studies of small congregations show that consistent, authentic social media use can accelerate follower growth, boost engagement, and foster year-over-year expansion — outcomes that align beautifully with stewarding the gifts God has given, however small the starting point." },

      { type: "h2", text: "A Reflective Perspective" },
      { type: "p", html: "This is not about chasing trends or worldly metrics, but about faithful obedience. Just as the early church leveraged Roman roads and the common Greek language to spread the Good News, we are privileged to use digital “roads” — websites, video, and social media platforms — to proclaim Christ." },
      { type: "p", html: "An online presence equips a small church to be more hospitable, visible, and responsive to a world that increasingly lives online. It allows testimonies of transformation to travel far, prayers to be shared instantly, and the hope of the gospel to meet seekers in their moments of need." },

      { type: "h2", text: "Reaching Your Locality Online" },
      { type: "p", html: "When people arrive at your website, what do they see? Is it attractive and inviting? Does it clearly highlight your church’s unique distinctives — its heart for God’s Word, its love for people, and its place in the community? A well-crafted website provides a powerful opportunity to engage visitors with the gospel even before they set foot in your building." },
      { type: "p", html: "JesusOnline offers engaging, biblically grounded presentations that your church can easily incorporate into your website. These resources help turn casual visitors into people who encounter the living Christ, strengthening your local ministry impact." },

      { type: "h2", text: "Reaching the World Online" },
      { type: "p", html: "Your church can also extend its ministry presence internationally. By partnering with JesusOnline, even a small congregation can reach 30 to 50 people with a gospel presentation for every dollar invested in targeted outreach. What is even more remarkable is that, on average, one or two of those individuals indicate they have committed their lives to Christ as a result. We handle all the logistics, follow-up, and discipleship connections, allowing your church to participate without strain." },
      { type: "p", html: "Each March and April, we invite churches to join a special Easter Outreach that presents an evidence-based gospel, clearly sharing the historical reality that Christ rose from the dead and offers forgiveness, love, and eternal hope. This is one of the most powerful seasons to introduce people to Jesus. Together, we can deliver the resurrection gospel directly to young adults and seekers on their phones." },
      { type: "p", html: "Every day, our concise nine-minute video presents compelling historical evidence that Christ conquered the grave, guiding viewers toward a personal commitment to follow Him. Join other believing churches around the world in proclaiming the resurrection of Jesus to those who may never walk into a church building — but who will encounter Him online." },
      { type: "p", html: "An online outreach church is not a replacement for the gathered body of believers, but a faithful extension of it — multiplying your church’s witness for the glory of God and the advance of His Kingdom. Whether strengthening your local presence or reaching across the globe, the Lord who calls us also equips us." },
      { type: "p", html: "If your church would like assistance evaluating your current website, incorporating ready-made gospel resources, or exploring partnership in digital outreach, we would be glad to help. May the Lord grant wisdom and fruitfulness as you prayerfully consider how best to shine His light in this digital harvest field." },

      { type: "h3", text: "Free JesusOnline Media Resources for Your Website" },
      { type: "ul", items: [
        '<a href="https://jesusonline.com/god-is-hope/" target="_blank" rel="noopener noreferrer">Hope-themed gospel resources</a>',
        '<a href="https://jesusonline.com/forever-loved/" target="_blank" rel="noopener noreferrer">Love-themed gospel resources</a>',
        '<a href="https://jesusonline.com/receive-jesus/jesus-resurrection-and-you/" target="_blank" rel="noopener noreferrer">Jesus’ Resurrection and You</a>',
        '<a href="https://jesusonline.com/receive-jesus/the-gift-of-heaven/" target="_blank" rel="noopener noreferrer">The Gift of Heaven</a>',
      ]},

      REGISTER_CTA,
    ],
  },

  {
    id: "an-attractive-and-inviting-church",
    title: "An Attractive and Inviting Church",
    description:
      "What draws a newcomer to return? The factors “church shoppers” prioritize — and practical, grace-filled ways a small church can remove barriers so people encounter the living God.",
    blocks: [
      { type: "p", html: "<em>Note: This article is written primarily with churches in the Western world in mind. However, the biblical truths it presents apply to all congregations, in every cultural context. We strongly encourage you to thoughtfully adapt and apply these principles to your own local situation and culture.</em>" },

      { type: "p", html: "What makes a church or home group truly attractive to a newcomer? What impression do they carry away from their first visit, and what draws them to return? These questions matter deeply, for the church is called to reflect the welcoming heart of Christ, removing unnecessary barriers so that souls may encounter the living God." },
      { type: "p", html: "“Church shoppers” — first-time visitors, those relocating, or individuals exploring faith — evaluate congregations through a blend of practical, emotional, and spiritual lenses. Surveys from respected sources such as Pew Research and Barna consistently reveal shared priorities." },
      { type: "p", html: "Considering the needs, priorities, and preferences of those outside the church does not mean compromising the biblical integrity, standards, or convictions of the body of Christ. It is an expression of God’s love to consider the interests of others (Philippians 2:4) — to journey together from wherever they may be toward becoming the men and women God recreated them to be in Christ. While no church can be all things to all people, thoughtful attention to these areas can open doors for genuine gospel impact." },

      { type: "h2", text: "Top Factors “Church Shoppers” Prioritize" },
      { type: "ul", items: [
        "<strong>Quality of preaching and teaching</strong> (often ranked first, cited by roughly 83%). Visitors seek clear, relevant, biblical exposition that connects eternal truth to daily life — depth without excessive jargon, practical application, and authenticity from the preacher.",
        "<strong>A warm, genuine welcome and hospitality</strong> (cited by about 79%). Do greeters smile and offer helpful guidance? Do regular attendees — not merely staff — notice and engage visitors naturally? Relational warmth rooted in the love of Christ outweighs polished programs.",
        "<strong>Style of worship and service flow</strong> (around 74%). Music, atmosphere, and order should feel engaging and accessible. Newcomers appreciate services that are easy to follow, with gentle explanations of elements such as communion or the offering.",
        "<strong>Location and convenience</strong> (approximately 70%). Proximity, parking, clear signage, and suitable service times significantly influence decisions, especially for families and busy individuals.",
        "<strong>Community, relationships, and belonging.</strong> Many, particularly younger adults, long for authentic connection amid widespread loneliness — a place where people genuinely care and where low-pressure pathways to friendship exist.",
        "<strong>Children’s and family considerations.</strong> Parents assess safety, cleanliness, and family-friendliness. Even without elaborate programs, a welcoming posture toward children speaks volumes.",
        "<strong>Relevance, authenticity, and values alignment.</strong> Is the church genuine rather than performative? Does the teaching address real struggles?",
      ]},
      { type: "p", html: "Additional factors include practical outreach to those in need, clean and well-maintained facilities, a spirit of inclusion, and thoughtful, non-intrusive follow-up." },
      { type: "p", html: "At the heart of it all, church shoppers are not primarily seeking perfection or entertainment. They desire a place to encounter God, form meaningful relationships, and grow spiritually within a welcoming community. Churches that combine solid biblical teaching with sincere love and practicality bear lasting fruit." },

      { type: "h2", text: "What Can a Small Church Do to Be Attractive?" },
      { type: "p", html: "Smaller congregations may lack extensive resources, yet they possess unique strengths — intimacy, intergenerational fellowship, and the opportunity to live out the biblical vision of the church as God’s family (Ephesians 2:19; 4:11–16). With prayerful intention, even modest adjustments can communicate care and create space for the Holy Spirit’s work." },

      { type: "h3", text: "Sanctuary Impressions" },
      { type: "p", html: "The first moments upon entering matter profoundly. Are visitors greeted with genuine smiles and helpfulness, feeling seen yet not overwhelmed? Many small churches have sanctuaries built for larger crowds than currently attend, and a mostly empty room can feel discouraging. Consider creative rearrangements: remove excess pews or chairs, or set out round tables seating five to eight with chairs primarily facing the platform. Space that appears comfortably occupied creates a warmer, fuller impression and naturally fosters interaction during prayer or discussion." },

      { type: "h3", text: "The Centrality of Preaching and Teaching" },
      { type: "p", html: "Surveys confirm that transformational insight in the message carries far greater weight than the delivery skill of the messenger. Substance — clear biblical truth, practical application, and Spirit-empowered challenge — builds committed disciples. Delivery serves the message: enthusiasm, clarity, vocal variety, eye contact, and relatable illustrations help profound truths land effectively." },
      { type: "p", html: "Aim for balance — roughly 80% content and 20% delivery. Pastors can grow by recording sermons, seeking honest feedback, and prioritizing authenticity over performance. The goal remains encountering God and seeing lives transformed, not merely impressing with words." },

      { type: "h3", text: "Welcoming Families and Children" },
      { type: "p", html: "The absence of a dedicated children’s program need not hinder hospitality. Many vibrant small churches view this as an opportunity for authentic intergenerational discipleship." },
      { type: "ul", items: [
        "<strong>Cultivate a culture of grace.</strong> Publicly affirm that children are a blessing and that their sounds and movements are welcomed as part of family worship.",
        "<strong>Train the congregation.</strong> Encourage older saints especially to respond with patience and joy — offering smiles, quiet help, or sitting near families as an expression of Christ’s love for the little ones (Matthew 19:14).",
        "<strong>Offer practical supports.</strong> Prepare simple “busy bags” with crayons and sermon-related coloring sheets; incorporate brief children’s moments; reserve flexible seating near the front or sides for families; and preach accessibly, using illustrations that speak to all ages.",
      ]},

      { type: "h2", text: "A Hopeful Conclusion" },
      { type: "p", html: "An attractive church ultimately flows from dependence on the Holy Spirit and fidelity to Scripture. By addressing first impressions with wisdom and love, small congregations can remove obstacles so that newcomers may clearly hear the gospel and experience the warmth of God’s people." },
      { type: "p", html: "May every church and home group prayerfully examine itself — not out of pressure to perform, but with a desire to equip the saints and glorify Christ (Ephesians 4:11–16). In doing so, we participate in the Father’s redemptive work, inviting others into the joy of knowing and following Jesus." },
      { type: "p", html: "JesusOnline can’t help you with sanctuary impressions or with welcoming families and children, but we can provide resources for transformational teaching supported by inspiring videos." },

      ...WLL,
      { type: "h3", text: "Transformational Teaching Resources" },
      { type: "ul", items: [
        '<a href="/channels/growth">JO EQUIP Grow resources</a>',
        '<a href="/playlists">JO EQUIP playlists</a>',
      ]},

      REGISTER_CTA,
    ],
  },
];

export function getBcgArticle(id: string): BcgArticle | undefined {
  return bcgArticles.find(a => a.id === id);
}

/**
 * Returns the next published BCG article (the one right after `id`), wrapping to
 * first. `unlisted` articles are excluded from the sequence: they are never
 * returned as a "next" target, and asking for the next of an unlisted article
 * returns undefined (so its page shows no next CTA — it is inline-link-only).
 */
export function getNextBcgArticle(id: string): BcgArticle | undefined {
  const listed = bcgArticles.filter(a => !a.unlisted);
  if (listed.length < 2) return undefined;
  const idx = listed.findIndex(a => a.id === id);
  if (idx === -1) return undefined;
  return listed[(idx + 1) % listed.length];
}
