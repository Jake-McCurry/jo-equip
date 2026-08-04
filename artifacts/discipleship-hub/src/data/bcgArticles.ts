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
  | { type: "figure"; src: string; alt: string; caption?: string }
  /* Resource list with Read / Video / PDF buttons, styled like the chips on
     channel/topic pages: orange + linked when the URL is known, gray when
     not. `href` (optional) links the resource title itself and drives the
     Read chip. Internal links
     are root-relative ("/channels/...", "/playlist/..."); the page component
     prefixes the base path, and the PDF build rewrites them to absolute
     equip.jesusonline.com URLs. */
  | { type: "resourceList"; items: ResourceListItem[] };

export interface ResourceListItem {
  title: string;
  /** Optional link for the title text itself (rendered blue + underlined). */
  href?: string;
  pdf?: string;
  video?: string;
}

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
  html: '<strong><a href="/register-church">Sign up and register your church today to become a FREE JO Equipped Church. →</a></strong>',
};

/* The "Toolkit for Engagement" image introduces the recommended-resources
   list on several articles, so it's defined once and spread in. (It replaced
   the former "Free JesusOnline Watch → Learn → Live Resources" text pitch.) */
const WLL: ArticleBlock[] = [
  { type: "figure", src: "bgc2-3", alt: "The Toolkit for Engagement: JO EQUIP Resources — Watch (capture attention immediately), Learn (deepen your content), Live (drive lasting impact)." },
];

export const bcgArticles: BcgArticle[] = [
  {
    id: "gods-unique-vision-for-your-church",
    title: "A Unique Vision for Kingdom-Focused Growth",
    description:
      "Faithful pastor or small-group leader not seeing growth? JesusOnline offers free media and discipleship resources to help you grow deep — and God will grow you wide.",
    blocks: [
      { type: "figure", src: "bgc1-1", alt: "Opening illustration for A Unique Vision for Kingdom-Focused Growth — a faithful shepherd and the flock God has entrusted to him." },

      { type: "p", html: "You are a pastor, a small-group leader, or an elder/leader of a congregation. You have been faithful to the Great Shepherd, feeding and shepherding His sheep. Yet you are not seeing growth and vitality." },
      { type: "p", html: "God has a unique vision for your church — one that fits your people perfectly and releases fresh growth, life, and Kingdom impact." },
      { type: "p", html: "JesusOnline Ministries is here to help." },
      { type: "p", html: "We provide high-quality free media and discipleship resources designed to assist you in equipping God’s people He has already entrusted to you, so that they can fully participate in the missions and ministries for which God has designed them." },
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

      { type: "p", html: "We are confident that when you minister God’s way — equipping the saints toward Kingdom maturity so they can more fully and fruitfully participate in God’s master plan — He is faithful to bless the work of your hands." },
      { type: "p", html: "Isn’t it reasonable to expect that if you pour yourself into faithful, biblical ministry, the Lord of the Harvest will bring the increase in His perfect timing? After all, making disciples of all nations is His mandate (Matthew 28:19), spiritual multiplication is His strategy (2 Timothy 2:2), and you are His coworker (1 Corinthians 3:9)." },
      { type: "figure", src: "bgc1-3", alt: "The Lord of the Harvest brings the increase in His perfect timing." },

      { type: "h2", text: "Let’s Build Christ’s Kingdom Together" },
      { type: "p", html: "If you are a disciple-maker — whether in formal ministry or through informal relationships — and you’re passionate about transformation that results in eternal impact, we’d love to partner with you." },
      { type: "p", html: "To become any of the following churches is not a program but a process. It involves discipleship, because it requires the change of individual hearts and the culture of the church by the power of the Holy Spirit." },
      { type: "p", html: "It is human nature to look at what we consider a successful church or group and try to imitate what they do. While it is wise to learn from one another — and while there is certainly a valid strategy in multiplying churches and groups that share common characteristics — God has created your fellowship to be unique." },
      { type: "p", html: "Just as He has filled the earth with a wide variety of flowers, trees, and birds, He desires His people to reach every segment of society in their own distinct way. Simply copying other churches or groups because you want to be like them will not fulfill your fellowship’s God-given unique identity and mission." },
      { type: "figure", src: "bgc1-4", alt: "Partnering with pastors and church leaders to strengthen and equip the flock God has entrusted to them." },

      { type: "p", html: "Whether you’re discipling one person or leading discipleship for an entire church — whether you are a leader of a small group or a pastor of many churches — your labor is a critical element in His plan to advance His Kingdom on earth. Let us assist you in better equipping God’s people for the good works He has prepared for them (Ephesians 2:10)." },

      { type: "h2", text: "Growing Church Models" },
      { type: "p", html: "The definition of the church varies, and there are many rich traditions and expressions. In this series of articles, when we use the word “church,” we are referring to a local gathering of believers called out to be sent out by Jesus. The church is functionally a fellowship — a community on God’s mission." },
      { type: "p", html: "Therefore, the principles and approaches discussed in these church models apply not only to local congregations but also to home churches and to both formal and informal small groups." },

      { type: "h2", text: "Ready to go deeper?" },
      { type: "p", html: "Explore the articles below to see how JesusOnline Ministries can help your church become:" },
      { type: "ul", items: [
        '<a href="/channels/church/become-growing-church/a-jesusonline-equipped-church">A JO Equipped Church</a>',
        '<a href="/channels/church/become-growing-church/a-total-life-discipleship-church">A Total Life Discipleship Church</a>',
        '<a href="/channels/church/become-growing-church/a-transformational-teaching-church">A Transformational Teaching Church</a>',
        '<a href="/channels/church/become-growing-church/a-spirit-dependent-church">A Spirit-dependent Church</a>',
        '<a href="/channels/church/become-growing-church/a-hope-filled-church">A Hope-filled Church</a>',
        '<a href="/channels/church/become-growing-church/a-love-demonstrating-relational-church">A Love-demonstrating Relational Church</a>',
        '<a href="/channels/church/become-growing-church/an-intentional-worship-church">An Intentional Worship Church</a>',
        '<a href="/channels/church/become-growing-church/a-great-commission-church">A Great Commission Church</a>',
        '<a href="/channels/church/become-growing-church/an-online-outreach-church">An Online Outreach Church</a>',
        '<a href="/channels/church/become-growing-church/an-attractive-church">An Attractive Church</a>',
        '<a href="/channels/church/become-growing-church/an-inviting-church">An Inviting Church</a>',
        '<a href="/channels/church/become-growing-church/a-model-church">A Model Church</a>',
      ]},

      { type: "p", html: "Discover practical, biblical resources created specifically to help churches like yours flourish right where God has planted you." },
      REGISTER_CTA,
      { type: "figure", src: "bgc1-5", alt: "Become a free JO Equipped Church — closing call to register and partner together." },
    ],
  },

  {
    id: "a-jesusonline-equipped-church",
    title: "A JO Equipped Church",
    description:
      "Small-church pastors wear many hats with little support. JesusOnline’s free Watch → Learn → Live resources help you save prep time, engage your people, and deepen retention.",
    blocks: [
      { type: "figure", src: "bgc2-1", alt: "Opening illustration for A JO Equipped Church — the many hats a small-church pastor wears." },

      { type: "p", html: "If you are a pastor of a small church, you carry a unique load of responsibilities. You wear multiple hats every single week, often with limited resources and little to no support staff. You may even work at another job to make ends meet — while still being expected to preach, counsel, visit, lead, and manage the church." },
      { type: "p", html: "You’re frequently swamped with day-to-day survival tasks, leaving little time or energy for the bigger vision God has given you. On top of that, attempts to try new things are sometimes met with resistance from well-meaning members who prefer to keep doing things “the way we’ve always done them.” Reaching new generations and adapting to cultural shifts can feel nearly impossible." },
      { type: "figure", src: "bgc2-2", alt: "The weight of small-church ministry — survival tasks, resistance to change, and the challenge of reaching new generations." },

      { type: "p", html: "JesusOnline Ministries is here to come alongside you. And there are no fees or hidden costs. What we offer is totally free." },
      { type: "p", html: "We provide high-quality, free media and discipleship resources created specifically to assist you in faithfully equipping the flock God has entrusted to you." },
      { type: "figure", src: "bgc2-3", alt: "The Toolkit for Engagement: JO EQUIP Resources — Watch (capture attention immediately), Learn (deepen your content), Live (drive lasting impact)." },

      { type: "p", html: "<strong>JO EQUIP</strong> is a free digital library of practical discipleship tools for pastors and disciple-makers — carefully organized into three mission-driven channels so you can find exactly what you need, when you need it." },
      { type: "p", html: "JesusOnline offers free <em>Watch → Learn → Live</em> resources to strengthen engagement, depth, and retention in your ministry." },

      { type: "h3", text: "1. Watch" },
      { type: "p", html: "Open your message with a powerful, well-crafted video clip. Short, high-impact videos set the emotional tone, provide an overview of the message, and draw people in immediately — even those who may be distracted or visiting for the first time. Perfect for sermon introductions, youth groups, or small-group discussions." },
      { type: "h3", text: "2. Learn" },
      { type: "p", html: "Weave insightful articles and written resources into your sermon preparation and Bible studies. Draw from fresh biblical perspectives, credible scholarship, and practical insights that add depth and authority to your messages. Whether you’re preaching on core doctrines or everyday Christian living, these tools help you connect Scripture to real life with greater clarity and impact." },
      { type: "h3", text: "3. Live" },
      { type: "p", html: "End your message by simply sharing the JesusOnline app (app.jesusonline.com) or its QR code. This gives your people an easy, ongoing way to review the sermon, reflect on the key truths, complete related Bible studies or devotionals, and actually apply what they’ve heard long after they leave the service. Many pastors use the app to extend the impact of their teaching week after week." },
      { type: "p", html: "You can use our resources for your Sunday message, your Bible study, or your discipleship ministry." },
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
      { type: "p", html: 'If you’re looking to develop or improve your discipleship ministry, we offer free coaching — contact Pastor Jonathan for more information (<a href="mailto:equip@jesusonline.com">equip@jesusonline.com</a>).' },
      { type: "p", html: "All resources are completely free, mobile-friendly, and thoughtfully created with the real challenges of small-church ministry in mind." },

      { type: "h2", text: "Three Dedicated Channels to Support Your Ministry" },
      { type: "p", html: '<strong><a href="/channels/evidence">Evidence resources</a></strong> help skeptics and doubters in your congregation (or community) encounter compelling reasons for faith. Topics include:' },
      { type: "ul", items: [
        "Jesus’ true identity",
        "The existence of God",
        "The reliability of the Bible",
      ]},
      { type: "p", html: "Use these for apologetics sermons, seeker-friendly services, or one-on-one conversations." },
      { type: "p", html: '<strong><a href="/channels/growth">Growth resources</a></strong> build mature, fruitful disciples in your church. Extensive tools cover:' },
      { type: "ul", items: [
        "Bible study",
        "Devotionals",
        "Prayer guides",
        "Worship",
        "Experiencing God 24/7",
        "Laying a solid foundation",
        "Building blocks for maturity",
        "Attitude and behavior",
        "Godly relationships",
      ]},
      { type: "p", html: "Ideal for small groups, discipleship classes, mentoring, and personal spiritual formation." },
      { type: "p", html: '<strong><a href="/channels/church">Church resources</a></strong> multiply disciples and strengthen your church’s health and mission. Practical materials cover:' },
      { type: "ul", items: [
        "Making and multiplying disciples",
        "Total life discipleship core principles",
        "Becoming a growing church",
        "Understanding evangelism and sharing your faith",
        "Next steps for new believers",
        "Rapid church planting and disciple-making movements",
        "Survey of the Bible and Bible training curriculum",
      ]},
      { type: "p", html: "Great for leadership training, outreach planning, and developing a disciple-making culture." },
      { type: "p", html: "All of these resources are high-quality and designed with small-church realities in mind. Whether you’re preparing a sermon, equipping leaders, discipling new believers, or reaching your community, JO EQUIP and the JesusOnline app are here to lighten your load and multiply your impact — without adding to your budget or administrative burden." },
      { type: "p", html: "You focus on what only you can do as the shepherd of your flock. Let us help equip the saints for the work of ministry." },
      { type: "p", html: 'Ready to get started? Visit <a href="/">JO EQUIP</a> today and explore the channels.' },
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
      { type: "resourceList", items: [
        { title: "Part 1: Core Principles", href: "/channels/church/tld-core-principles", video: "/playlist/total-life-discipleship-core-principles" },
        { title: "Part 2: Kingdom Perspective", href: "/channels/church/tld-kingdom-perspective", video: "/playlist/total-life-discipleship-kingdom-perspective" },
        { title: "Part 3: Building Blocks for Maturity", href: "/channels/growth/building-blocks" },
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
      "Three complementary aspects of teaching — head, hands, and heart — and the three essential truths that produce irreversible heart change in the believers you shepherd.",
    blocks: [
      { type: "figure", src: "bgc4-1", alt: "Opening illustration for A Transformational Teaching Church — equipping believers through God’s Word." },

      { type: "p", html: "The first-century believers were devoted to the apostles’ teaching (Acts 2:42)." },
      { type: "p", html: "Scripture calls us not only to know the truth, but to live it out and be transformed by it (cf. John 8:31–32; 17:17; Romans 12:2; 2 Corinthians 3:18; James 1:22–25; 1 John 2:4)." },
      { type: "figure", src: "bgc4-2", alt: "Knowing the truth, living it out, and being transformed by it — the threefold call of Scripture." },
      { type: "p", html: "There are three distinct and complementary aspects to teaching:" },

      { type: "h2", text: "1. Bible Knowledge (The Head)" },
      { type: "p", html: "This is the foundational, verse-by-verse expository teaching that builds a solid understanding of Scripture. It focuses on what the Bible says — its history, context, doctrines, and accurate interpretation. The goal is biblical literacy and doctrinal soundness so that God’s people may <em>“know the truth”</em> (John 8:32)." },

      { type: "h2", text: "2. Life Application (The Hands)" },
      { type: "p", html: "This approach draws practical principles and examples from Scripture and shows how they apply to everyday life. It answers the question, <em>How should we live?</em> It equips believers to obey God’s Word in their relationships, work, decisions, and daily challenges. This is the bridge between knowledge and action." },

      { type: "h2", text: "3. Transformation (The Heart)" },
      { type: "p", html: "This is the deepest and most vital level of biblical teaching. It moves beyond the transmission of information, or even the application of principles, to focus on the foundational core truths of the Gospel that genuinely change the heart and irreversibly transform lives." },
      { type: "p", html: "Our resources are specifically designed to strengthen the third dimension of teaching: transformation (the Heart)." },

      { type: "h2", text: "3 Essential Truths" },
      { type: "p", html: "The following three truths are the core content of teaching and the bedrock of discipleship, including Total Life Discipleship." },
      { type: "p", html: "When believers internalize these truths, the Holy Spirit produces irreversible heart change and Christlike maturity. They bring every dimension of life — thoughts, desires, habits, relationships, work, time, resources, and purpose — under the loving lordship of Jesus Christ. The result is not merely informed or active believers, but disciples who are radically transformed from the inside out (Romans 12:2; Galatians 4:19)." },
      { type: "figure", src: "bgc4-3", alt: "Three essential truths — the character of God, our new identity in Christ, and the ministry of the Holy Spirit." },

      { type: "h3", text: "1. The Full Character and Nature of God" },
      { type: "p", html: "Our view of God’s character and attributes shapes everything else in our lives — our worship, our trust, our obedience, and our responses to trials. While God’s attributes are often mentioned in sermons, they are rarely taught as a complete, balanced whole. The result is a fragmented, sometimes distorted image of God." },
      { type: "p", html: "For example, when we elevate His love above His holiness and justice — or any other attribute at the expense of the others — we no longer see the God of Scripture. A true vision of God in all His glory (merciful yet righteous, loving yet sovereign) becomes the foundation for healthy fear of the Lord, deep worship, and transformed living." },

      { type: "h3", text: "2. Our New Identity in Christ" },
      { type: "p", html: "At the very moment a person is born again, Scripture declares that <em>“the old has passed away; behold, the new has come”</em> (2 Corinthians 5:17). In Christ, believers are no longer defined by their past or their failures. They are a brand-new creation with a new position, a new identity, and a new self-image." },
      { type: "p", html: "Yet this profound truth is seldom taught clearly. The Apostle Paul routinely addressed ordinary first-century believers as <em>“saints.”</em> When we see ourselves primarily as “sinners saved by grace,” we tend to live like sinners. But when we grasp that in God’s eyes we are now saints — righteous in Christ — holy living becomes the new normal. Sin is no longer our identity; it is an intruder to be rejected and put to death because it is foreign to who we truly are in Christ." },

      { type: "h3", text: "3. The Ministry and Power of the Holy Spirit" },
      { type: "p", html: "The Holy Spirit has been given to every believer to dwell within them, empower them, comfort them, convict them, and guide them into all truth. He is not a distant force but a personal Helper who enables us to live the Christian life as God intends." },
      { type: "p", html: "Tragically, many believers have little understanding of the Spirit’s various ministries or how to cooperate with Him daily. Without this knowledge, they are left striving in their own strength — only to experience repeated frustration, burnout, and defeat. Believers must walk by the Spirit, relying on His power and yielding to His leading moment by moment." },

      { type: "h2", text: "Head, Hands, and Heart Together" },
      { type: "p", html: "A transformational teaching church applies the three aspects of teaching to help believers internalize the three essential truths." },
      { type: "p", html: "By holistically — head, hands, and heart — teaching God’s people about the full character of God, their new identity in Christ, and the empowering ministry of the Holy Spirit, you can help them break free from sinful habits, develop Christlike character, live in a dynamic fellowship with God, and make an eternal impact right where He has placed them." },
      { type: "p", html: "This integrated approach is the very focus of what JesusOnline exists to support." },

      ...WLL,

      { type: "h3", text: "From Building Blocks for Maturity" },
      { type: "resourceList", items: [
        { title: "God’s Majestic Qualities", href: "/channels/growth/bb-growing-closer-majesty" },
        { title: "Your New Identity, Overview", href: "/channels/growth/bb-becoming-new-you" },
        { title: "Walking by the Spirit", href: "/channels/growth/bb-walking-spirit" },
      ]},

      { type: "h3", text: "Recommended Resources on Amazon" },
      { type: "ul", items: [
        '<a href="https://www.amazon.com/God-Discover-Character-Bill-Bright/dp/1563991217" target="_blank" rel="noopener"><em>God: Discover His Character</em></a> by Bill Bright',
        '<a href="https://www.amazon.com/Living-Supernaturally-Christ-Bill-Bright/dp/1563991454" target="_blank" rel="noopener"><em>Living Supernaturally in Christ</em></a> by Bill Bright',
        '<a href="https://www.amazon.com/His-Intimate-Presence-Experiencing-Transforming/dp/1563991926" target="_blank" rel="noopener"><em>His Intimate Presence: Experiencing the Transforming Power of the Holy Spirit</em></a> by Bill Bright',
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
      { type: "figure", src: "bgc5s2-1", alt: "Becoming a Spirit-dependent church — moving from human strategy to God’s power. A church family sharing a meal together." },
      { type: "p", html: "A church demonstrates dependence on the Holy Spirit when its practices, priorities, and outcomes increasingly reflect reliance on God’s power rather than human strategies, programs, or charisma alone. The results belong to God. Yet this dependence is rarely perfect; it is an ongoing journey of learning to lean on the Spirit amid weakness, failure, and the daily pressures of ministry." },

      { type: "h2", text: "Marks of a Spirit-Dependent Church" },
      { type: "p", html: "Such dependence is seen in a church that values fervent corporate prayer, regularly seeking God’s direction for decisions and plans — even when human strategies still compete for attention. It appears in biblical preaching and teaching, centered on Christ, that honestly confronts sin, calls for repentance and holiness, and leads to real, though sometimes gradual, transformation in people’s lives. Worship, though imperfect, carries moments of genuine passion and Christ-exalting focus. The church also makes room for spiritual gifts to build up the body and encourages believers to share the gospel with boldness — often in spite of fear or inadequacy." },
      { type: "p", html: "Corporate dependence grows as individual believers — with all their struggles — learn to recognize the Holy Spirit’s personal ministries and cooperate with Him more consistently. He patiently teaches truth and illuminates Scripture; helps us in prayer when words fail; keeps us moving toward holiness even when we stumble; comforts us in trials; fosters peace in broken relationships; protects us from evil; guides our decisions; and empowers our service." },
      { type: "p", html: "The clearest evidence is the growing fruit of the Spirit within the community — love, joy, peace, patience, kindness, generosity, and unity — visible not in flawless performance but in relationships that reflect grace, forgiveness, and “bearing with one another in love” through trials. Dependence on the Spirit also shows itself in the humility that admits human weakness, confesses sin quickly, and keeps returning to the Spirit for fresh filling and strength." },
      { type: "figure", src: "bgc5s2-5", alt: "The evidence of the Spirit’s growing fruit — visible in relationships that reflect grace, forgiveness, and endurance through trials: love, joy, peace, patience, kindness, generosity, unity." },
      { type: "p", html: "The Christian life is not a burden of flawless performance we must carry alone. It is Christ living His life in us and through us by the power of the Holy Spirit — bringing freedom, peace, joy, and victory even in our imperfection. By God’s grace, we walk this path one day at a time, always returning to a yielded heart through confession, faith, and obedience." },
      { type: "figure", src: "bgc5s2-8", alt: "Walk in the freedom of the Spirit — a sunlit path through the trees." },

      ...WLL,
      { type: "h3", text: "Holy Spirit Resources" },
      { type: "resourceList", items: [
        { title: "Walking by the Spirit", href: "/channels/growth/bb-walking-spirit" },
        { title: "Power for Supernatural Living", href: "/channels/growth/kingdomnomics-son-power" },
        { title: "Walk in the Spirit, a video series", video: "/playlist/life-in-the-spirit" },
        { title: "Living by the Spirit", href: "/channels/growth/new-life-christ/living-by-the-spirit" },
        { title: "How to Be Filled with the Holy Spirit", href: "/channels/growth/bb-walking-spirit" },
        { title: "Holy Spirit, a New Life in Christ Bible study", href: "/channels/growth/new-life-christ" },
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
      { type: "figure", src: "bgc6s2-1", alt: "Become a hope-filled church — stand as a radiant beacon in a world often shadowed by uncertainty." },
      { type: "p", html: "A hope-filled church stands as a radiant beacon in a world often shadowed by uncertainty, offering confidence rooted in Christ’s resurrection. Without hope, people struggle with despair, isolation, and stagnation. With it, they endure hardship better and pursue growth." },
      { type: "p", html: "Christian hope isn’t vague wishful thinking — it is confident expectation grounded in God’s character, His promises, and the resurrection of Jesus. This hope transforms despair into assurance, reminding people that suffering has meaning and that God’s good and perfect purposes will be fulfilled, even amid challenges that sometimes make no sense." },
      { type: "figure", src: "bgc5s-3", alt: "Biblical hope is not wishful thinking — comparison of cultural optimism (vague wishful thinking that ignores reality) with Christian hope (confident expectation grounded in God’s character, His promises, and the resurrection of Jesus)." },
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
      { type: "figure", src: "bgc6s2-5", alt: "Five God-centered shifts in perspective — instead of your circumstances, focus on God’s majesty; instead of limited resources, God’s faithfulness; instead of worries about tomorrow, today’s blessings; instead of predicting the future, the next step; instead of adversity, God’s supernatural presence." },
      { type: "p", html: "Through such intentional, Scripture-saturated guidance, a church not only sustains its members but equips them to walk as beacons of hope in their daily lives." },
      { type: "p", html: "JesusOnline stands ready as a faithful partner, offering a treasury of free resources to help your church fully embrace and reflect this hope-filled identity. These resources equip you not merely to teach, but to create weekly encounters where the God of hope moves powerfully among His people. Through them, both first-time visitors and longtime believers can experience the refreshing work described in Romans 15:13 — being filled with joy and peace as they trust in Him, overflowing with hope by the power of the Holy Spirit." },
      { type: "p", html: "In a world hungry for assurance, JesusOnline resources help transform your church into a vibrant wellspring of renewal: a place where burdens are lifted, perspectives are renewed, and hearts are continually pointed toward the living hope found in Christ alone." },

      ...WLL,
      { type: "h3", text: "Hope Resources" },
      { type: "resourceList", items: [
        { title: "Hope in Times of Crisis", href: "/channels/growth/hope-times-crisis", video: "/playlist/hope-in-times-of-crisis" },
        { title: "Bible Promises for Hope", href: "/channels/growth/bible-promises-hope" },
        { title: "God Is Hope", href: "https://jesusonline.com/god-is-hope/" },
      ]},

      REGISTER_CTA,
      { type: "figure", src: "bgc6s2-6", alt: "5 grace-centered shifts in focus — focus on God’s majesty more than your circumstances, God’s faithfulness instead of your limited resources, today’s blessings rather than worries about tomorrow, the next step instead of attempting to predict the future, and God’s supernatural presence more than your adversity." },
    ],
  },

  {
    id: "a-love-demonstrating-relational-church",
    title: "A Love-demonstrating Relational Church",
    description:
      "The greatest witness to the world is the sacrificial love Christians show one another. How a relational church prioritizes depth over breadth — fueled by God’s unconditional, unstoppable, unfathomable love.",
    blocks: [
      { type: "figure", src: "bgc7s2-1", alt: "The Love-demonstrating Relational Church — friends gathered around a table in warm fellowship." },
      { type: "p", html: "At its heart, the love-demonstrating relational church believes that the greatest witness to the world is not flashy services or impressive buildings, but the tangible, sacrificial love Christians show toward one another and their neighbors. Jesus Himself declared this the defining mark of His followers:" },
      { type: "quote", html: "By this everyone will know that you are my disciples, if you love one another.", cite: "John 13:35" },
      { type: "p", html: "The relational church takes this command seriously — not as a nice sentiment, but as its core operating system." },

      { type: "h2", text: "What It Looks Like in Practice" },
      { type: "figure", src: "bgc7s2-3", alt: "The blueprint of relational community — depth over breadth, vulnerability and authenticity, love in action, relationally outward-focused." },
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
      { type: "figure", src: "bgc7s2-5", alt: "The source of personal transformation — God’s love is unconditional, unstoppable, unfathomable." },
      { type: "ul", items: [
        "<strong>God’s love is unconditional.</strong> He loves you because of who He is, not because of what you have or haven’t done. “But God demonstrates His own love toward us, in that while we were still sinners, Christ died for us” (Romans 5:8, NKJV).",
        "<strong>God’s love is unstoppable.</strong> No matter the circumstance, you will never be separated from the love God has for you (Romans 8:38–39).",
        "<strong>God’s love is unfathomable.</strong> God’s love for you is so vast that it surpasses anything your mind can imagine — “how wide, how long, how high, and how deep his love is” (Ephesians 3:18–19).",
      ]},
      { type: "p", html: "As 1 John 4:19 reminds us, “We love because he first loved us.”" },
      { type: "p", html: "First, people experience God’s love by beginning a genuine relationship with Him. Then, as they cultivate that relationship, they encounter His limitless, transforming love. They delight in the reality of being forever loved by God, allowing this truth to become their constant source of identity and assurance. Because they know they are unconditionally, unstoppably, and unfathomably loved, the Holy Spirit enables them to become channels of that same love. God desires His loving nature to become their nature, so that His love overflows from them to others. When people are secure in God’s forever love, that transforming love naturally touches everyone within their sphere of influence." },
      { type: "p", html: "The world desperately needs living demonstrations of the love of Christ expressed through His people, together. This vision is not about trying harder to love others. It is about being so filled with God’s love that loving others becomes the natural overflow of a transformed life." },
      { type: "figure", src: "bgc7s2-7", alt: "The ripple effect of forever love — when people are secure in God’s forever love, that transforming love naturally touches everyone within their sphere of influence." },

      ...WLL,
      { type: "h3", text: "Love Focus Resources" },
      { type: "resourceList", items: [
        { title: "Forever Loved series", href: "/channels/growth/forever-loved" },
        { title: "Experience God’s Love playlist", video: "/playlist/experience-gods-love" },
        { title: "40 Days of God’s Love", href: "/channels/growth/days-god-s-love", video: "/playlist/experience-gods-love" },
        { title: "Timeless Love, Transforming Love", href: "/books/timeless-love-transforming-love" },
        { title: "Love Bible studies", href: "https://jesusonline.com/forever-loved/bible-studies/" },
        { title: "One Another series", href: "/channels/growth/bb-living-family" },
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
      { type: "figure", src: "bgc7s-1", alt: "The Intentional Worship Church — equipping congregations to worship in spirit and truth. A hymnal open on a chair in a quiet sanctuary." },
      { type: "p", html: "<em>Note: This article is written primarily with churches in the Western world in mind. However, the biblical truths it presents apply to all congregations, in every cultural context. We strongly encourage you to thoughtfully adapt and apply these principles to your own local situation and culture.</em>" },

      { type: "h2", text: "Worship Through Music" },
      { type: "p", html: "Music is one of the primary ways we exalt God during corporate worship services." },
      { type: "p", html: "King David identified himself as “Israel’s beloved singer of songs” (2 Samuel 23:1) and brought organized music — especially instrumental music and structured choral worship — into the formal worship of Yahweh." },
      { type: "p", html: "Music is powerful because it is the language of our hearts. It stirs the heart, unites the congregation, and lifts our collective voice toward heaven. The melody and instrumentation move and engage us, while the lyrics convey their message. So we must ask: are the words of the songs we sing acceptable in the sight of the LORD (cf. Psalm 19:14)? An intentional worship church is deliberate about selecting and singing songs that are rich in biblical truth, theologically sound, and vertically focused on God." },

      { type: "h2", text: "Core Principle: God Must Remain the Focal Point" },
      { type: "p", html: "Regardless of the style of music, the focus should always be on God — not on the song leaders or the worship band’s performance. An effective worship leader or team makes it a priority not to be the focal point." },
      { type: "ul", items: [
        "The platform is not a stage for talent; it is a place of service.",
        "Lights, sound, skill, and charisma should support the congregation’s voice, not overshadow it.",
        "The goal is not to impress people but to direct every heart toward the greatness of God.",
      ]},
      { type: "p", html: "When musicians and leaders step back — through humble posture, simple arrangements, and lyrics that keep pointing upward — the church is freed to worship in spirit and truth." },
      { type: "figure", src: "bgc7s-2", alt: "The platform is a place of service, not a stage for talent — congregation and worship leaders both directing their focus upward to God." },

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
      { type: "figure", src: "bgc7s-8", alt: "Practical filters for the intentional worship leader — theological depth and singability, leadership posture, and the “hidden team” test." },
      { type: "p", html: "When music and lyrics work together to proclaim God’s worth — with every leader and musician intentionally deflecting attention back to Him — the church is truly edified, unbelievers sense the presence of God, and Christ is magnified. In an intentional worship church, the goal of every song, every leader, and every gathering remains the same as the goal of every believer’s life: to glorify God and enjoy Him forever." },
      { type: "p", html: "This intentional approach transforms worship from a performance or a passive event into a powerful, God-centered act of ascribing worth to the One who alone is worthy." },
      { type: "figure", src: "bgc7s-9", alt: "A powerful, God-centered act of ascribing worth — the final goal of every song, every leader, and every gathering: to glorify God and enjoy Him forever." },

      REGISTER_CTA,
    ],
  },

  {
    id: "a-great-commission-church",
    title: "A Great Commission Church",
    description:
      "World evangelization is the supreme task of the church. Drawing on Oswald J. Smith’s vision, how a Great Commission church makes missions its DNA — in its preaching, its budget, and its practice.",
    blocks: [
      { type: "figure", src: "bgc8s-1", alt: "The Great Commission Church — a globe beside an open Bible, recalling Jesus’ command to “go and make disciples of all nations.”" },
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
      { type: "figure", src: "bgc8s-5", alt: "Missions as the DNA of the entire church — not delegated to a small group, but the focus of every person, beginning with the head pastor, elders, deacons, and staff." },

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
      { type: "figure", src: "bgc8s-7", alt: "Practical ways a local church can participate in the Great Commission — preach it from the pulpit, support local outreach, send and host missionaries, reach immigrants, partner with missions organizations, pray, and equip members." },
      { type: "p", html: "Although Oswald J. Smith has gone to his reward in Heaven, he leaves behind a Great Commission–focused church that has not only reached millions for Christ but still follows his example of obedience to Jesus’ words: “Go into all the world and make disciples of all nations.”" },

      REGISTER_CTA,
      { type: "figure", src: "bgc8s-9", alt: "The supreme task — “Go and make disciples of all nations.” (Matthew 28:19). Following Pentecost, the apostle Paul established local churches as the primary, God-ordained means of accomplishing this Great Commission. It is not an individual calling; it is a congregational mandate." },
    ],
  },

  {
    id: "an-online-outreach-church",
    title: "An Online Outreach Church",
    description:
      "In a digital age, an online presence is an essential extension of the Great Commission. How even small churches can reach their locality and the world online — with free JesusOnline gospel resources.",
    blocks: [
      { type: "figure", src: "bgc10s2-1", alt: "The Online Outreach Church — the internet as a vast mission field where even modest congregations can shine." },
      { type: "p", html: "In our digital age, an online presence is no longer merely helpful for a church — it has become an essential extension of its calling to fulfill the Great Commission. As followers of Christ, we are commissioned to “go and make disciples of all nations” (Matthew 28:19), a mandate that transcends physical walls and embraces every available means to reach hearts with the gospel. Today, the internet stands as a vast mission field, where even modest congregations can shine." },

      { type: "h2", text: "Why It Matters Deeply for Small Churches" },
      { type: "p", html: "Many people first encounter a church not through its doors, but through a search engine, a social media post, or a streamed service. Recent data underscores this reality: roughly 89% of churches maintain some form of digital presence, and about 25 million Americans engage with church life online — either primarily or alongside in-person attendance. More than 80% of people visit a church’s website before deciding to attend in person, making a clear and welcoming online “front door” essential." },
      { type: "figure", src: "bgc10s2-2", alt: "The digital front door — about 89% of churches maintain a digital presence, 25 million Americans engage with church life online, and more than 80% of people visit a church’s website before attending in person." },
      { type: "p", html: "For small churches, the advantages are particularly compelling. Limited seating or resources need no longer constrain outreach. A faithful online witness can:" },
      { type: "ul", items: [
        "Extend evangelism beyond Sunday mornings — reaching the unchurched, the hurting, or those in remote areas who may never initially step inside a building.",
        "Support discipleship and community, allowing members and newcomers alike to access teaching, prayer, and connection throughout the week.",
        "Fuel measurable growth. Churches with growing online engagement often see corresponding increases in in-person attendance; online views can serve as a leading indicator of vitality.",
      ]},
      { type: "p", html: "Studies of small congregations show that consistent, authentic social media use can accelerate follower growth, boost engagement, and foster year-over-year expansion — outcomes that align beautifully with stewarding the gifts God has given, however small the starting point." },
      { type: "figure", src: "bgc10s2-5", alt: "Digital roads for the gospel — just as the early church leveraged Roman roads and the common Greek language, churches today use websites, video, and social media to proclaim Christ." },

      { type: "h2", text: "A Reflective Perspective" },
      { type: "p", html: "This is not about chasing trends or worldly metrics, but about faithful obedience. Just as the early church leveraged Roman roads and the common Greek language to spread the Good News, we are privileged to use digital “roads” — websites, video, and social media platforms — to proclaim Christ." },
      { type: "p", html: "An online presence equips a small church to be more hospitable, visible, and responsive to a world that increasingly lives online. It allows testimonies of transformation to travel far, prayers to be shared instantly, and the hope of the gospel to meet seekers in their moments of need." },
      { type: "figure", src: "bgc10s2-6", alt: "A hospitable, visible, responsive online presence — testimonies travel far, prayers are shared instantly, and the hope of the gospel meets seekers in their moments of need." },

      { type: "h2", text: "Reaching Your Locality Online" },
      { type: "p", html: "When people arrive at your website, what do they see? Is it attractive and inviting? Does it clearly highlight your church’s unique distinctives — its heart for God’s Word, its love for people, and its place in the community? A well-crafted website provides a powerful opportunity to engage visitors with the gospel even before they set foot in your building." },
      { type: "p", html: "JesusOnline offers engaging, biblically grounded presentations that your church can easily incorporate into your website. These resources help turn casual visitors into people who encounter the living Christ, strengthening your local ministry impact." },
      { type: "figure", src: "bgc9s-8", alt: "Engaging, biblically grounded gospel presentations for your church website — turning casual visitors into people who encounter the living Christ." },

      { type: "h2", text: "Reaching the World Online" },
      { type: "p", html: "Your church can also extend its ministry presence internationally. By partnering with JesusOnline, even a small congregation can reach 30 to 50 people with a gospel presentation for every dollar invested in targeted outreach. What is even more remarkable is that, on average, one or two of those individuals indicate they have committed their lives to Christ as a result. We handle all the logistics, follow-up, and discipleship connections, allowing your church to participate without strain." },
      { type: "p", html: "Each March and April, we invite churches to join a special Easter Outreach that presents an evidence-based gospel, clearly sharing the historical reality that Christ rose from the dead and offers forgiveness, love, and eternal hope. This is one of the most powerful seasons to introduce people to Jesus. Together, we can deliver the resurrection gospel directly to young adults and seekers on their phones." },
      { type: "p", html: "Every day, our concise nine-minute video presents compelling historical evidence that Christ conquered the grave, guiding viewers toward a personal commitment to follow Him. Join other believing churches around the world in proclaiming the resurrection of Jesus to those who may never walk into a church building — but who will encounter Him online." },
      { type: "figure", src: "bgc10s2-9", alt: "Proclaiming the resurrection online — a concise nine-minute video presents compelling historical evidence that Christ conquered the grave, reaching people on their phones around the world." },
      { type: "p", html: "An online outreach church is not a replacement for the gathered body of believers, but a faithful extension of it — multiplying your church’s witness for the glory of God and the advance of His Kingdom. Whether strengthening your local presence or reaching across the globe, the Lord who calls us also equips us." },
      { type: "p", html: "If your church would like assistance evaluating your current website, incorporating ready-made gospel resources, or exploring partnership in digital outreach, we would be glad to help. May the Lord grant wisdom and fruitfulness as you prayerfully consider how best to shine His light in this digital harvest field." },

      ...WLL,
      { type: "h3", text: "Free JesusOnline Media Resources for Your Website" },
      { type: "ul", items: [
        '<a href="https://jesusonline.com/god-is-hope/" target="_blank" rel="noopener noreferrer">Hope-themed gospel resources</a>',
        '<a href="https://jesusonline.com/forever-loved/" target="_blank" rel="noopener noreferrer">Love-themed gospel resources</a>',
        '<a href="https://jesusonline.com/receive-jesus/jesus-resurrection-and-you/" target="_blank" rel="noopener noreferrer">Jesus’ Resurrection and You</a>',
        '<a href="https://jesusonline.com/receive-jesus/the-gift-of-heaven/" target="_blank" rel="noopener noreferrer">The Gift of Heaven</a>',
      ]},

      REGISTER_CTA,
      { type: "figure", src: "bgc10s2-10", alt: "Equipping your website with ready gospel resources — JesusOnline offers engaging, biblically grounded presentations your church can easily incorporate: God is Hope, Forever Loved, Jesus’ Resurrection & You, and The Gift of Heaven." },
    ],
  },

  {
    id: "an-attractive-church",
    title: "An Attractive Church",
    description:
      "What makes a church truly attractive to a newcomer? The factors “church shoppers” prioritize — and practical, grace-filled ways a small church can remove barriers to the gospel.",
    blocks: [
      { type: "figure", src: "bgc11s2-1", alt: "Cultivating an Attractive Church — small congregations possess a unique advantage in creating spaces of profound warmth, biblical substance, and authentic welcome." },
      { type: "p", html: "<em>Note: This article is written primarily with churches in the Western world in mind. However, the biblical truths it presents apply to all congregations, in every cultural context. We strongly encourage you to thoughtfully adapt and apply these principles to your own local situation and culture.</em>" },

      { type: "p", html: "What makes a church or home group truly attractive to a newcomer? What impression do they carry away from their first visit, and what draws them to return? These questions matter deeply, for the church is called to reflect the welcoming heart of Christ, removing unnecessary barriers so that souls may encounter the living God." },
      { type: "p", html: "“Church shoppers” — first-time visitors, those relocating, or individuals exploring faith — evaluate congregations through a blend of practical, emotional, and spiritual lenses. Surveys from respected sources such as Pew Research and Barna consistently reveal shared priorities. While no church can be all things to all people, thoughtful attention to these areas can open doors for genuine gospel impact." },

      { type: "h2", text: "Top Factors “Church Shoppers” Prioritize" },
      { type: "figure", src: "bgc11s2-2", alt: "What church shoppers are actually seeking — Truth (quality of preaching and values alignment), Community (meaningful relationships and belonging), Environment (warm hospitality and service flow), and Family (children and intergenerational integration), all centered on encountering God and growing spiritually." },
      { type: "ul", items: [
        "<strong>Quality of preaching and teaching</strong> (often ranked first, with approximately 83% citing its importance). Visitors seek clear, relevant, biblical exposition that connects eternal truth to daily life. They desire depth without excessive jargon, practical application, and authenticity from the preacher. Weak or routine messages frequently prevent return visits, whereas transformative insights foster lasting loyalty.",
        "<strong>A warm, genuine welcome and hospitality</strong> (cited by about 79%). Do greeters smile and offer helpful guidance? Do regular attendees — not merely staff — notice and engage visitors in a natural way? People quickly sense whether they are seen and valued or left feeling invisible. Relational warmth from the congregation often outweighs polished programs.",
        "<strong>Style of worship and service flow</strong> (around 74%). Music, atmosphere, and overall order should feel engaging and accessible. Preferences differ — contemporary, traditional, or blended — but newcomers appreciate services that are easy to follow, with gentle explanations of elements such as communion or the offering.",
        "<strong>Location and convenience</strong> (approximately 70%). Proximity, parking, clear signage, and suitable service times significantly influence decisions, especially for families and busy individuals.",
        "<strong>Community, relationships, and belonging.</strong> Many, particularly younger adults, long for authentic connection amid widespread loneliness. They seek a place where people genuinely care for one another and where low-pressure pathways exist for friendship and involvement.",
        "<strong>Children’s and family considerations.</strong> Parents often assess safety, cleanliness, and the overall family-friendliness of the environment. Even without elaborate programs, a welcoming posture toward children speaks volumes about care and professionalism.",
        "<strong>Relevance, authenticity, and values alignment.</strong> Is the church genuine rather than performative? Does the teaching address real struggles? Do beliefs and practices resonate with the visitor’s search for purpose, truth, and an alternative to superficial culture?",
      ]},
      { type: "p", html: "Additional factors include practical outreach to those in need, clean and well-maintained facilities, a spirit of inclusion, and thoughtful, non-intrusive follow-up." },
      { type: "p", html: "At the heart of it all, church shoppers are not primarily seeking perfection or entertainment. They desire a place to encounter God, form meaningful relationships, and grow spiritually within a welcoming community. Churches that combine solid biblical teaching with sincere love and practicality often bear lasting fruit." },

      { type: "h2", text: "What Can a Small Church Do to Be Attractive?" },
      { type: "p", html: "Smaller congregations may lack extensive resources, yet they possess unique strengths — intimacy, intergenerational fellowship, and the opportunity to live out the biblical vision of the church as God’s family (Ephesians 2:19; 4:11–16). The “cover” of first impressions does influence whether someone opens the pages of your life together. With prayerful intention, even modest adjustments can communicate care and create space for the Holy Spirit’s work." },

      { type: "h3", text: "Sanctuary Impressions" },
      { type: "p", html: "The first moments upon entering matter profoundly. Are visitors greeted with genuine smiles and helpfulness, feeling seen yet not overwhelmed? Many small churches have sanctuaries built for larger crowds than currently attend, and a mostly empty room can feel discouraging. Consider creative rearrangements: remove excess pews or chairs and arrange round tables seating five to eight, placing chairs primarily on the side facing the platform. This provides space for Bibles, notes, or a cup of coffee and naturally fosters interaction during prayer or discussion. Tables that appear comfortably occupied create a warmer, fuller impression." },

      { type: "h3", text: "The Centrality of Preaching and Teaching" },
      { type: "p", html: "Smaller churches may not attract highly polished orators, yet surveys confirm that transformational insights in the message carry far greater weight than oratory skill alone. Substance — clear biblical truth, practical application, and Spirit-empowered challenge — builds committed disciples. Delivery serves the message: enthusiasm, clarity, vocal variety, eye contact, and relatable illustrations help profound truths land effectively." },
      { type: "figure", src: "bgc11s2-5", alt: "Substance carries greater weight than polish — transformational biblical insights outweigh rhetorical skill and oratory polish: clear biblical truth, practical application, Spirit-empowered challenge." },
      { type: "p", html: "Aim for balance — roughly 80% content and 20% delivery. Passion for Scripture naturally enhances communication. Pastors can grow through recording sermons, seeking honest feedback, and prioritizing authenticity over performance. For newcomers, engaging delivery aids initial connection; for all, faithful exposition that meets real needs leads to lasting change. The goal remains encountering God and seeing lives transformed, not merely impressing with words." },

      { type: "h3", text: "Welcoming Families and Children" },
      { type: "p", html: "The absence of a dedicated children’s program need not hinder hospitality. Many vibrant small churches view this as an opportunity for authentic intergenerational discipleship." },
      { type: "ul", items: [
        "<strong>Cultivate a culture of grace.</strong> Publicly affirm that children are a blessing and that their sounds and movements are welcomed as part of family worship. This reassures parents and signals belonging.",
        "<strong>Train the congregation.</strong> Encourage older saints especially to respond with patience and joy — offering smiles, quiet help, or sitting near families as an expression of Christ’s love for the little ones (Matthew 19:14).",
      ]},
      { type: "p", html: "Practical supports include:" },
      { type: "ul", items: [
        "Prepare simple “busy bags” with crayons, sermon-related coloring sheets, or quiet activities.",
        "Incorporate brief children’s moments, object lessons, or invitations for kids to participate in singing, Scripture reading, or prayer.",
        "Reserve flexible seating near the front or sides for families, perhaps with a quiet corner or cry room.",
        "Preach accessibly, using illustrations that speak to all ages and occasionally addressing children directly.",
      ]},
      { type: "p", html: "Such measures foster a shared family experience that strengthens home discipleship and reflects the shepherding care of pastor-teachers." },
      { type: "figure", src: "bgc11s2-8", alt: "Cultivating an atmosphere of transformation — when a church aligns spatial warmth (sanctuary and welcome), biblical substance (preaching and truth), and family inclusion (intergenerational participation), it creates an environment primed for life change." },

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

  {
    id: "an-inviting-church",
    title: "An Inviting Church",
    description:
      "Why would your members eagerly invite others? Cultivate a compelling Unique Value Proposition and equip your church family with practical tools for joyful invitation.",
    blocks: [
      { type: "figure", src: "bgc12s2-1", alt: "Become an Inviting Church — extending invitations and welcoming newcomers with open arms." },
      { type: "p", html: "<em>Note: This article is written primarily with churches in the Western world in mind. However, the biblical truths it presents apply to all congregations, in every cultural context. We strongly encourage you to thoughtfully adapt and apply these principles to your own local situation and culture.</em>" },

      { type: "p", html: "Every faithful pastor and church leader longs to see their congregation naturally inviting others to join them in worship on Sunday mornings. You have likely encouraged and even exhorted your members to reach out, to be bold in extending invitations, and to welcome newcomers with open arms. This desire flows from a heart aligned with the Great Commission — our Lord’s call to make disciples of all nations (Matthew 28:19)." },
      { type: "p", html: "Yet a deeper question remains: <em>Why would your members eagerly invite others?</em> What is it about your church family that stirs such genuine excitement in their hearts that they long to share it, confident that others, too, will find blessing and transformation there?" },
      { type: "p", html: "Consider how people recommend a cherished restaurant or a powerful film. They do so not because someone has urged them, but from authentic delight — an experience so meaningful they cannot help but share it. In the same way, invitations to church should spring not primarily from dutiful pressure, but from lives deeply touched by the presence of Christ among His people." },

      { type: "h2", text: "Your Church’s Unique Value Proposition" },
      { type: "p", html: "A church’s Unique Value Proposition (UVP) is the distinctive combination of biblical truth, spiritual experience, and practical ministry that sets it apart in its community. It answers the heartfelt question: <em>Why would someone choose this church family over others nearby?</em> More than marketing language, programs, or doctrinal statements, a faithful UVP flows from prayerful discernment of God’s calling, reflects the living reality of Christ among His people, and equips believers to invite others with authentic joy." },
      { type: "figure", src: "bgc12s2-3", alt: "Defining your Unique Value Proposition (UVP) — the distinctive intersection of biblical truth, spiritual experience, and practical ministry that sets a church apart in its community." },
      { type: "p", html: "Members are naturally most eager to share something when it is uniquely beneficial — something others cannot readily find elsewhere. This uniqueness, whether actual or perceived, is one of the strongest motivators for joyful invitation. What does your church offer that truly cannot be said about other congregations nearby?" },
      { type: "p", html: "Through the resources of JO EQUIP, your church can cultivate a compelling UVP:" },
      { type: "ul", items: [
        'You can become known as a <a href="/channels/church/become-growing-church/a-hope-filled-church">hope-filled church</a>, making hope a hallmark of your identity and a beacon of gospel assurance in a despairing world.',
        'You can be known as a <a href="/channels/church/become-growing-church/a-transformational-teaching-church">transformational, teaching church</a>, utilizing inspiring media and the JO App for sermon follow-up and ongoing discipleship — an integrated approach rare among local congregations.',
        'You can be identified as a <a href="/channels/church/become-growing-church/a-total-life-discipleship-church">Total Life Discipleship church</a>, motivating members to become all God created them to be so they can do all He created them to do. Rather than urging greater self-effort, you lead by repeatedly sharing God’s vision for their lives, fostering authentic transformation by the power of the Holy Spirit.',
      ]},
      { type: "figure", src: "bgc12s2-4", alt: "Uniqueness is the strongest motivator for joyful invitation — a UVP-driven church replaces guilt and obligation with genuine excitement, blending in with being distinctly beneficial, and scripted programs with natural, joyful overflow." },
      { type: "p", html: "Beyond uniqueness, how does your church stand out more than similar churches in your area? With God’s guidance, your church can thrive in other crucial areas that promote deeper relationships with Christ and His community." },
      { type: "ul", items: [
        'Being a <a href="/channels/church/become-growing-church/a-love-demonstrating-relational-church">love-demonstrating relational church</a>, where authentic fellowship reflects the warmth of God’s family.',
        'Being a <a href="/channels/church/become-growing-church/a-spirit-dependent-church">Spirit-dependent church</a>, relying on the Holy Spirit’s guidance in every aspect of ministry.',
        'Being an <a href="/channels/church/become-growing-church/an-intentional-worship-church">intentional worship church</a>, where gatherings exalt Christ with reverence and joy.',
        'Being an <a href="/channels/church/become-growing-church/an-online-outreach-church">online outreach church</a>, extending the gospel’s reach through digital means.',
        'Being a <a href="/channels/church/become-growing-church/a-great-commission-church">Great Commission-focused church</a>, intentionally advancing Christ’s mission in your community and around the world.',
      ]},
      { type: "p", html: "When church members personally experience the transformational benefits offered in the Become a Growing Church resources, they will be excited to tell others. Through practical, biblically grounded teachings on identity in Christ, Spirit-led fellowship, purposeful discipleship, and authentic community, they discover renewed hope, clarity of calling, and the joy of belonging to God’s family. As these realities reshape their daily lives and shared life together, a natural desire emerges: they long for others to encounter the same life-changing grace." },
      { type: "p", html: "In such a church, inviting others becomes an overflow of love rather than an assigned task. It echoes the early church, devoted to teaching, fellowship, breaking bread, and prayer, so that “the Lord added to their number day by day those who were being saved” (Acts 2:42–47)." },
      { type: "p", html: "As you reflect on your church’s life together, ask the Lord to cultivate an environment so vibrant with His presence — nourished by these equipping resources and marked by distinctive excellence — that your members naturally become inviters. May every gathering be marked by such evident love, truth, and joy in Christ that those who come encounter not merely a service, but the living God who changes lives forever. In this way, your church becomes not only welcoming, but truly inviting — a beacon that draws others into the abundant life found in Jesus." },
      { type: "figure", src: "bgc12s2-7", alt: "Healthy internal identity creates natural outward invitation — a compelling UVP and JO EQUIP resources cultivate a thriving community, generate joyful member confidence, and result in natural, eager invitations." },

      { type: "h2", text: "Practical Tools and Ways for Church Members to Invite Others" },
      { type: "p", html: "Every pastor and church leader longs to see members naturally inviting others into the life of the church, not out of obligation, but from hearts overflowing with gratitude for what God is doing. As believers experience the transformative power of a hope-filled, Spirit-dependent community nourished by resources like the Become a Growing Church series and JO EQUIP, they become eager to share this grace with friends, neighbors, coworkers, and family. The invitation flows best when it arises from personal testimony and is supported by simple, effective tools." },
      { type: "p", html: "Here are practical ways members can extend warm, authentic invitations, rooted in prayerful dependence on the Holy Spirit and the unique value your church offers:" },

      { type: "h3", text: "1. Share Personal Testimonies of Transformation" },
      { type: "ul", items: [
        "Encourage members to speak naturally about how God has renewed their hope, clarified their identity in Christ, or strengthened their walk through the church’s discipleship. A simple story — “I’ve found renewed purpose through the teachings on who I am in Christ” — often opens doors more powerfully than any program.",
        "Tie it to JO EQUIP resources: “The JO App has helped me grow daily in God’s Word — would you like to check it out with me?”",
      ]},

      { type: "h3", text: "2. Use Ready-to-Share Digital Tools from JO EQUIP and the JO App" },
      { type: "ul", items: [
        "<strong>JO App:</strong> Members can invite others to download the free app (available on iOS and Android), which offers the NET Bible, daily devotions, interactive studies, worship resources, and Total Life Discipleship tools. It serves as an excellent “next step” for seekers exploring the claims of Christ or believers pursuing deeper growth.",
        "Share links to specific JO App articles or sermon follow-up content via text, email, or social media. The app’s prayer community and evidence-based “Facts for Faith” sections are particularly inviting for those with questions.",
      ]},

      { type: "h3", text: "3. Practical Invitation Aids" },
      { type: "ul", items: [
        "<strong>Invitation cards or digital invites:</strong> Provide attractive printed cards or shareable graphics highlighting a specific upcoming service, sermon series, or special event. Include a warm welcome message and QR code linking to the church website.",
        "<strong>Social media and personal networks:</strong> Encourage members to post brief, genuine updates: a photo from worship with a caption about God’s faithfulness, or a direct invitation: “Join us this Sunday — I’d love for you to experience this with me.”",
        "<strong>Everyday conversations:</strong> Train members in simple, relational approaches, such as asking, “Do you attend church anywhere?” or “I’ve been so encouraged lately — would you ever be interested in coming with me?” Follow up with prayer and genuine care.",
      ]},

      { type: "h3", text: "4. Relational and Event-Based Invitations" },
      { type: "ul", items: [
        "Invite people first to low-pressure gatherings: a small group, a community outreach event, or a meal following worship.",
        "Highlight your church’s distinctive strengths — hope-filled identity in Christ, Spirit-led fellowship, or intentional discipleship — so the invitation feels personal and compelling.",
        "Follow through with hospitality: assign greeters, prepare newcomer packets, and ensure follow-up contact that reflects God’s welcoming love.",
      ]},
      { type: "figure", src: "bgc12s2-8", alt: "Equipping members across the entire invitation spectrum — spontaneous to structured, analog/relational (personal testimonies, relational and event-based invitations) to digital/equipped (social media outreach, ready-to-share tools from JO EQUIP and the JO App)." },

      { type: "h3", text: "5. Prayerful Preparation and Equipping" },
      { type: "ul", items: [
        "Begin with prayer — for specific people God has placed in their lives and for boldness tempered by love.",
        "Periodically equip the congregation during services: share brief testimonies, distribute tools, and practice simple invitation language together. This builds confidence and reinforces that inviting is a natural outflow of transformed lives.",
      ]},

      { type: "p", html: "As members step out in these ways, trusting the Holy Spirit’s work, they participate in the Great Commission not as a duty, but as joyful witnesses. The early church grew as ordinary believers lived out their faith in authentic community, and the Lord added daily to their number (Acts 2:47). May your church family, equipped through these resources and marked by distinctive excellence, become a beacon that draws many into the abundant life found in Jesus Christ." },
      { type: "p", html: "Pastors, consider weaving these practical steps into your ongoing equipping ministry. The Lord who calls His people to invite is faithful to empower them as they do so." },

      { type: "h2", text: "A Promotional Church Business Card" },
      { type: "p", html: "A well-designed business card serves as a simple yet powerful tool for members to extend warm invitations. It captures the church’s Unique Value Proposition (UVP) at a glance and reflects the hope and excellence of your ministry. Aim for a clean, professional layout that feels inviting and faith-honoring — perhaps with a subtle cross or open Bible motif, warm earth tones, and ample white space for readability." },

      { type: "h3", text: "Recommended Card Specifications" },
      { type: "ul", items: [
        "<strong>Size:</strong> Standard 3.5\" × 2\" (horizontal orientation works well).",
        "<strong>Paper:</strong> Matte or slightly textured cardstock (14–16 pt) for a quality feel.",
        "<strong>Front side:</strong> Focused and welcoming — church identity and core UVP.",
        "<strong>Back side:</strong> Informative with bullet points and a clear call to action.",
        "<strong>Design tips:</strong> Use a readable serif or clean sans-serif font. Include your church logo if available. Add a QR code on the front or back linking to your website or JO App download page. Keep text concise for scannability.",
      ]},

      { type: "h3", text: "Sample Front Side (Main Identity & UVP)" },
      { type: "ul", items: [
        "<strong>Top:</strong> Church name in larger, elegant font.",
        "<strong>Center:</strong> A concise byline UVP statement answering, “Why would someone choose your church family over others nearby?”",
        "<strong>Bottom:</strong> Address, service times, and contact info.",
        "<strong>Optional:</strong> Subtle tagline or scripture at the footer.",
      ]},
      { type: "p", html: "Example text:" },
      { type: "quote", html: "<strong>[Church Name]</strong><br>Equipping you to flourish with God’s hope in every circumstance.<br><br>Sunday Worship: [Time] · [Street Address] · [City, State, ZIP] · [Phone] | [Church Email]<br><br>“Join us as we grow together in the grace and knowledge of our Lord Jesus Christ.” (2 Peter 3:18)" },

      { type: "h3", text: "Possible UVP Statements for Your Church Identity" },
      { type: "ul", items: [
        "Equipping you to flourish with God’s hope in every circumstance.",
        "Guiding you to shift from chaos to God’s majesty in life’s storms.",
        "Transforming fear into faith through a greater view of God.",
        "Helping you experience God’s victory and strength in difficult times.",
        "Helping you become all God created you to be.",
        "Equipping you to do all God created you to do.",
        "Leading you into Spirit-dependent, grace-based obedience.",
        "Anchoring you in relationship-centered, love-motivated discipleship.",
        "Supernatural peace and power found in Christ.",
        "Rising above trials with unshakable hope in Christ.",
        "Deeper identity and peace through Spirit-dependent living.",
        "Lasting life change through transformational teaching.",
        "Transforming trials into eternal impact through Christ’s power.",
        "Leading you into genuine Christlike transformation.",
        "Helping you align your life with God’s eternal purposes.",
        "Helping you experience deep heart transformation through God’s Word.",
        "Guiding you to embrace your new identity in Christ.",
        "Helping you know the full majestic character of God.",
        "Equipping you to walk daily by the Holy Spirit’s power.",
        "Holistic teaching that transforms head, hands, and heart.",
        "Anchoring life in God, new identity in Christ, and the Spirit’s power.",
        "Guiding you from God’s vision to personal transformation.",
      ]},

      { type: "h3", text: "Sample Back Side (Uniquenesses, Areas of Excellence & URL)" },
      { type: "ul", items: [
        "<strong>Header:</strong> “What Makes Our Church Family Unique?” or “Discover the Difference”.",
        "<strong>Bullet points:</strong> 3–5, kept brief.",
        "<strong>Footer:</strong> Church URL, QR code, and a gentle invitation.",
      ]},
      { type: "p", html: "Example text:" },
      { type: "quote", html: "<strong>Experience a Church That Equips You to Flourish</strong><br>• Hope-Filled Identity in Christ<br>• Transformational Teaching with JO App<br>• Total-Life Discipleship by God’s Vision<br>• Love-Demonstrating Relational Fellowship<br>• Spirit-Dependent Ministry in All Things<br><br>Visit us and experience the abundant life found in Jesus.<br>[Church Website URL] [QR Code]" },

      { type: "h3", text: "Possible Back-Side Bullet Points" },
      { type: "p", html: "Here is a variety of concise, scannable options for the back of your promotional card:" },
      { type: "ul", items: [
        "Hope-Filled Identity in Christ",
        "Transformational Teaching with JO App",
        "Total-Life Discipleship by God’s Vision",
        "Love-Demonstrating Relational Fellowship",
        "Warm Authentic Community in Christ",
        "Spirit-Dependent Ministry in All Things",
        "Intentional Worship and Outreach",
        "Exalting Christ in Worship",
        "Great Commission Focus with Joy",
        "Advancing Christ’s Mission Together",
        "Heart Transformation Through God’s Word",
        "Spirit-Led Discipleship and Growth",
      ]},

      { type: "h3", text: "Distribution Ideas" },
      { type: "ul", items: [
        "Include in newcomer packets, hand out during services, or encourage members to carry a small supply in wallets or cars.",
        "Pair with relational training: “Share your own story first, then offer the card as a next step.”",
      ]},
      { type: "p", html: "Such a card becomes more than promotional material — it serves as a quiet witness, reflecting the vibrant, equipping life of your church family. Pray over the design process, asking the Lord to use these simple tools to draw hearts toward Himself." },

      REGISTER_CTA,
    ],
  },

  {
    id: "a-model-church",
    title: "A Model Church",
    description:
      "A flexible, Spirit-led order of service that weaves the Become a Growing Church principles into your Sunday gathering — offered as a prayerful three-month trial.",
    blocks: [
      { type: "p", html: "In the preceding articles, we have offered a number of practical suggestions designed to help your church grow both in depth and in breadth — becoming a community marked by genuine transformation and vibrant hope in Christ." },
      { type: "p", html: "You may choose to incorporate some of these elements and the accompanying resources from Jesus Online Ministries, even if you are not yet prepared to adopt them all. Change is rarely easy. We grow comfortable with familiar routines, yet without intentional change, we cannot expect different outcomes. If the current patterns are not producing the fruit you long to see, a fresh approach may be what the Lord is inviting." },
      { type: "p", html: "What follows is one example of how a church might revise its Sunday gathering to weave together the core principles we have discussed. This represents a significant shift, so we recommend presenting it humbly to the congregation as a three-month trial. At the end of that season, evaluate together — under the Spirit’s guidance — whether to continue or adjust. Such a step can be taken prayerfully, with grace and unity." },
      { type: "p", html: "This proposed order of service is crafted to continually reinforce the transformational truths of the gospel that we so easily forget. In a world that daily pulls us away from God’s highway of holiness and hope, we need regular, Spirit-empowered reminders of who God is and who we are in Christ. Each element is designed to create a unique church experience that fosters lasting transformation in the lives of every attendee." },

      { type: "h2", text: "A Proposed Unique Church Order of Service" },
      { type: "ol", items: [
        "<strong>Welcome</strong> (unscripted, warm, and personal).<br /><em>Purpose:</em> To greet one another in the love of Christ and create an atmosphere of genuine belonging.",
        "<strong>Core Identity Statement.</strong><br /><em>Purpose:</em> To clearly declare the church’s identity for newcomers and to reinforce it for longtime members.<br />Suggested script: “We are a hope-centered church devoted to transformational teaching, so that you may become all that God created you to be and fulfill all He created you to do.”",
        "<strong>Transition to Hope Video.</strong><br /><em>Purpose:</em> To gently shift everyone’s focus from the cares and distractions of the week to the presence, power, and resources of God.<br />Suggested script: “As we gather together this morning, many of us have stepped out of a week marked by various struggles, difficulties, and challenges. In the midst of these, it can be difficult to turn our minds from those distractions and fully focus on the Lord. So let us begin by turning our hearts toward Him through a short video. It will help us refocus on God and the abundant resources He provides, as we entrust our challenges to His faithful care.”",
        "<strong>Show a Hope Video.</strong><br /><em>Purpose:</em> To captivate hearts and minds with one of the seventeen videos from the <a href=\"/channels/growth/hope-times-crisis\">“Hope in Times of Crisis”</a> series, reminding the congregation of God’s immediate and sufficient grace for every circumstance.",
        "<strong>Personal Takeaway.</strong><br /><em>Purpose:</em> To model how to apply biblical truth personally and encourage the congregation to do the same.<br />(The pastor or leader briefly shares, in their own words, one key insight from the video.)",
        "<strong>Congregation Prayer Requests.</strong><br /><em>Purpose:</em> To invite the community to share burdens and needs openly.",
        "<strong>Small-Group Prayer.</strong><br /><em>Purpose:</em> To practice relational prayer, build community, and anchor every request in the truth of who God is and who we are in Him.<br />(The congregation breaks into small groups to pray for the shared requests. At the same time, the screen gently displays an attribute of God along with a corresponding characteristic of our new identity in Christ — serving as timely reminders and reasons for praise.)",
        "<strong>Communion or Baptisms</strong> (optional).",
        "<strong>Worship and/or Praise Songs.</strong><br /><em>Purpose:</em> To respond to God’s goodness with wholehearted adoration and thanksgiving.",
        "<strong>Transformational Sermon.</strong><br /><em>Purpose:</em> To equip believers with truth that renews the mind and shapes daily life. (A message rooted in Scripture that connects directly to the <a href=\"/channels/growth/building-blocks\">building blocks of Christian maturity</a>.)",
        "<strong>Prayer and/or Devotion Songs.</strong><br /><em>Purpose:</em> To respond to the preached Word with surrender, commitment, and renewed devotion to Christ.",
        "<strong>Communion or Baptisms</strong> (alternate time slot).",
        "<strong>Closing Promise.</strong><br /><em>Purpose:</em> To send the congregation forth with a fresh assurance of God’s faithfulness that they can carry into the week.<br />(The congregation joins together in reciting a Bible promise, projected on the screen, that has been thoughtfully chosen to reinforce the sermon’s theme. This promise is drawn from the rich collection of “Bible Promises for Hope” available in the Jesus Online App.)",
      ]},

      { type: "p", html: "This model is not intended as a rigid formula, but as a flexible framework through which the Holy Spirit can work more deeply in your midst. May the Lord grant you wisdom, courage, and unity as you seek His leading for the unique calling He has placed on your church family. As you step forward in obedience, may you witness the joy of lives truly transformed for His glory." },

      REGISTER_CTA,
    ],
  },

  {
    id: "an-attractive-and-inviting-church",
    title: "An Attractive and Inviting Church",
    /* Unlisted July 2026: the Church sheet v.062526 split this into two list
       items, now backed by their own articles (an-attractive-church /
       an-inviting-church). Page stays reachable at its original URL (and PDF)
       for link durability but is excluded from prev/next navigation. */
    unlisted: true,
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
      { type: "p", html: "Smaller congregations may lack extensive resources, yet they possess unique strengths — intimacy, intergenerational fellowship, and the opportunity to live out the biblical vision of the church as God’s family (Ephesians 2:19; 4:11–16). The “cover” of first impressions does influence whether someone opens the pages of your life together. With prayerful intention, even modest adjustments can communicate care and create space for the Holy Spirit’s work." },

      { type: "h3", text: "Sanctuary Impressions" },
      { type: "p", html: "The first moments upon entering matter profoundly. Are visitors greeted with genuine smiles and helpfulness, feeling seen yet not overwhelmed? Many small churches have sanctuaries built for larger crowds than currently attend, and a mostly empty room can feel discouraging. Consider creative rearrangements: remove excess pews or chairs, or set out round tables seating five to eight with chairs primarily facing the platform. This provides room for Bibles, notes, or a cup of coffee. Space that appears comfortably occupied creates a warmer, fuller impression and naturally fosters interaction during prayer or discussion." },

      { type: "h3", text: "The Centrality of Preaching and Teaching" },
      { type: "p", html: "Surveys confirm that transformational insight in the message carries far greater weight than the delivery skill of the messenger. Substance — clear biblical truth, practical application, and Spirit-empowered challenge — builds committed disciples. Delivery serves the message: enthusiasm, clarity, vocal variety, eye contact, and relatable illustrations help profound truths land effectively." },
      { type: "p", html: "Aim for balance — roughly 80% content and 20% delivery. Passion for Scripture naturally enhances communication. Pastors can grow by recording sermons, seeking honest feedback, and prioritizing authenticity over performance. For newcomers, engaging delivery aids initial connection; for all, faithful exposition that meets real needs leads to lasting change. The goal remains encountering God and seeing lives transformed, not merely impressing with words." },

      { type: "h3", text: "Welcoming Families and Children" },
      { type: "p", html: "The absence of a dedicated children’s program need not hinder hospitality. Many vibrant small churches view this as an opportunity for authentic intergenerational discipleship." },
      { type: "ul", items: [
        "<strong>Cultivate a culture of grace.</strong> Publicly affirm that children are a blessing and that their sounds and movements are welcomed as part of family worship. This reassures parents and signals belonging.",
        "<strong>Train the congregation.</strong> Encourage older saints especially to respond with patience and joy — offering smiles, quiet help, or sitting near families as an expression of Christ’s love for the little ones (Matthew 19:14).",
      ]},
      { type: "p", html: "Practical supports include:" },
      { type: "ul", items: [
        "Prepare simple “busy bags” with crayons, sermon-related coloring sheets, or quiet activities.",
        "Incorporate brief children’s moments, object lessons, or invitations for kids to participate in singing, Scripture reading, or prayer.",
        "Reserve flexible seating near the front or sides for families, perhaps with a quiet corner or cry room.",
        "Preach accessibly, using illustrations that speak to all ages and occasionally addressing children directly.",
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

  /* ── SERMON COMMUNICATION PLANNING (Sermon Toolbox child topic) ──
     Four equip-original articles from the Aug 2026 docx
     (Sermon_Communication_Planning_Jake). Marked `unlisted` so they stay
     out of the BCG next-article rotation — next-nav is not needed here.
     Rendered at /channels/church/sermon-communication-planning/<id>. */
  {
    id: "what-is-your-motivation-for-preaching",
    title: "What is Your Motivation for Preaching?",
    description:
      "A pastor’s deepest motivation quietly shapes the sermon. Explore what drives your preaching — and how the purest motive yields messages that transform lives.",
    unlisted: true,
    blocks: [
      { type: "p", html: "Why do you preach? Pastors step into the pulpit for many reasons:" },
      { type: "ul", items: [
        "Institutional duty or the simple habit of filling the weekly preaching slot",
        "Enjoyment of public speaking or the desire for affirmation and recognition",
        "Pressure to grow attendance, giving, or outward measures of success",
        "Personal growth—the discipline of weekly preparation that keeps the pastor in the Word",
        "A desire to speak into cultural issues and bring clarity or courage to the moment",
        "Genuine love for Scripture and eagerness to share what has stirred their own heart",
        "Evangelistic burden for the lost who may be present",
        "Simple obedience to God’s calling to preach the Word faithfully, whether results are visible or not",
        "Deep love for the people and a desire to see believers grow and flourish in Christ",
      ]},
      { type: "p", html: "Some pastors preach primarily because it is their assigned responsibility. They may find satisfaction in public speaking or in the affirmation that follows a well-received message. In such cases, the underlying motive remains largely self-focused." },
      { type: "p", html: "Other pastors approach the pulpit from a deeper place. Motivated by a genuine love for Scripture, they view the weekly preparation as a personal opportunity for spiritual growth. They trust that the truths the Lord has impressed upon their own hearts will, in turn, strengthen and instruct those who listen." },
      { type: "p", html: "Still others are moved chiefly by concern for the spiritual condition of their people. Attuned to the needs the Holy Spirit reveals, they craft their messages to address the real struggles and longings of the congregation. Their greatest joy comes not from the act of preaching itself, but from witnessing lives transformed as believers grow in the likeness of Christ." },

      { type: "h2", text: "Your Motivation Will Determine the Message" },
      { type: "p", html: "A pastor’s deepest motivation quietly but powerfully shapes both the content and the tone of the sermon." },
      { type: "p", html: "When the primary drive is personal—whether fulfilling a job requirement, enjoying the platform, or seeking affirmation—the message often leans toward what will be well-received. Difficult texts may be softened, challenging applications avoided, and the sermon crafted more for immediate approval than for lasting transformation. The focus tends to rest on the preacher’s performance rather than on the hearer’s encounter with God." },
      { type: "p", html: "When the motivation rises to a genuine love for Scripture and personal growth, the sermon usually becomes richer in biblical content. The pastor speaks from truths that have first stirred his own heart. Yet even here the message can remain somewhat centered on what the preacher finds most compelling, rather than on what the congregation most urgently needs." },
      { type: "p", html: "The highest motivation—concern for the spiritual condition of the people, guided by the Holy Spirit, and rooted in obedience to God’s call—produces a different kind of sermon. The text is still carefully handled, but the application is shaped by the real struggles, questions, and longings of the congregation. Hard truths are not avoided, yet they are delivered with pastoral care. The aim is not merely to inform or to impress, but to see lives changed as the Word, applied by the Spirit, forms Christ in the hearers." },
      { type: "p", html: "In short, motivation determines whether the sermon serves the preacher, the text alone, or the people under the authority of the text. The purest motive consistently yields messages that are faithful to Scripture, sensitive to the Spirit’s leading, and aimed at the genuine growth of the people." },
    ],
  },

  {
    id: "retention-leads-to-transformation",
    title: "Retention Leads to Transformation",
    description:
      "True transformation rests not on the volume of information delivered, but on the portion retained, meditated upon, and applied. Preach for lasting retention.",
    unlisted: true,
    blocks: [
      { type: "p", html: "The pastor typically invests many careful hours each week in preparing the sermon—studying the text, seeking the Spirit’s guidance, and shaping the message with prayerful intent. On Sunday the congregation gathers and listens as attentively as possible for thirty or forty minutes, hoping to receive whatever the Holy Spirit chooses to highlight. Yet even the most earnest listeners soon discover how quickly the details begin to fade. By the end of the day much of the content has already slipped from memory; by the end of the week only fragments remain." },
      { type: "p", html: "This gap between the richness of the prepared Word and the limited capacity of human memory raises a vital question: What will actually remain to shape lives? True transformation does not rest on the volume of information delivered, but on the portion that is retained, meditated upon, and applied. When the Spirit plants even a single living truth deeply in the heart—and when that truth is later recalled, discussed, and obeyed—the sermon begins to bear lasting fruit. In this way, careful retention becomes the bridge between hearing the Word and being changed by it." },

      { type: "h2", text: "Avoid Mental Overload" },
      { type: "p", html: "Cognitive Load Theory, developed by John Sweller, reveals a fundamental truth about how we learn: working memory—the mental space where we temporarily hold and process new information—is severely limited. Most people can manage only a few new ideas at once before the system becomes overloaded. Long-term memory, by contrast, has vast capacity and stores organized knowledge that later makes new learning easier." },
      { type: "p", html: "Three kinds of mental demand compete for these limited resources. Intrinsic load comes from the inherent difficulty of the material itself. Extraneous load arises from the way information is presented—poor organization, unnecessary complexity, or too many ideas at once—and contributes nothing to genuine learning. Germane load is the productive effort of making sense of the material and forming lasting understanding." },
      { type: "p", html: "When these demands together exceed working memory’s capacity, little is retained beyond the moment. Effective teaching therefore seeks to reduce what is unnecessary, carefully sequence what is essential, and protect the mind’s limited resources so that lasting transformation becomes possible." },

      { type: "h3", text: "One Central Truth, Clearly Developed" },
      { type: "p", html: "Protect working memory by limiting the number of new ideas presented in a single message. When too many concepts, illustrations, and applications compete for attention at once, retention suffers. Focusing on one central truth, carefully developed and clearly applied, allows the mind to process more deeply." },
      { type: "p", html: "<strong>Practical guidance:</strong> Begin preparation by identifying the single main truth the text is pressing upon the hearer. Build the entire message around that truth—select only those illustrations and applications that serve it directly. Resist the urge to include every insight discovered in study. Ask repeatedly: “Does this point strengthen the central truth, or does it distract from it?”" },

      { type: "h3", text: "Clarity and Order Free the Mind" },
      { type: "p", html: "Reduce unnecessary mental effort by presenting the material with clarity and order. A simple structure, well-signposted transitions, and the avoidance of needless complexity free the hearer’s limited resources for what truly matters—engaging the truth itself rather than struggling to follow the delivery." },
      { type: "p", html: "<strong>Practical guidance:</strong> Outline the sermon in three clear movements or fewer. Use simple, memorable language rather than technical terms whenever possible. Signal each transition with a brief summary of what has been said and a clear statement of what comes next. Review the manuscript or notes specifically to remove anything that does not serve clarity." },

      { type: "h3", text: "Invite Active Engagement with the Truth" },
      { type: "p", html: "Create space for productive mental work. When the message invites the listener to connect the truth to their own life, to recall related Scriptures, or to consider concrete steps of obedience, the mind moves beyond passive reception toward lasting understanding. In this way the Spirit is given room to plant the Word more firmly in the heart." },
      { type: "p", html: "<strong>Practical guidance:</strong> Include brief moments of reflection during the sermon—pause after a key point and invite the congregation to consider how the truth speaks to their current circumstances. Pose a thoughtful question that prompts personal application. Close with one clear, specific step of obedience rather than a list of general suggestions. These small invitations help move the truth from the ear to the heart." },

      { type: "h2", text: "Less Is Usually More" },
      { type: "p", html: "In most cases, therefore, less proves to be more. A shorter sermon that centers on one clear truth, presents it with order, and invites thoughtful response protects the hearer’s cognitive resources. It creates space for the Spirit to plant the Word more deeply rather than scattering seed across ground already saturated. Length should serve transformation, not compete with it." },
    ],
  },

  {
    id: "give-them-what-they-need",
    title: "Give Them What They Need",
    description:
      "10 Building Blocks for Maturity are vital for balanced spiritual growth. These reflective questions help you discern what your people may need most right now.",
    unlisted: true,
    blocks: [
      { type: "p", html: '<strong><a href="/channels/growth/building-blocks">10 Building Blocks for Maturity</a></strong> are vital for balanced spiritual growth. They help believers intentionally strive to become more like Jesus. These reflective questions help you discern what people may need most at this time.' },
      { type: "ol", items: [
        '<strong>Seeing Life from God’s Perspective:</strong> Are they viewing circumstances through a worldly perspective instead of God’s character and purposes? <a href="/channels/growth/bb-seeing-life">[more]</a>',
        '<strong>Growing Closer to God:</strong> Do they prioritize religious activity over cultivating a living, affectionate relationship with the Lord? <a href="/channels/growth/bb-growing-closer">[more]</a>',
        '<strong>Becoming the New You:</strong> Are they still holding onto their old self-image and past failures instead of embracing their new identity in Christ? <a href="/channels/growth/bb-becoming-new-you">[more]</a>',
        '<strong>Walking by the Spirit:</strong> Is their life defined by self-effort, or do they demonstrate a vital reliance on the Holy Spirit’s guidance and power in their daily lives? <a href="/channels/growth/bb-walking-spirit">[more]</a>',
        '<strong>Receiving Insights from God:</strong> Are Scripture and mind renewal central, or are they more shaped by popular opinion and personal preference than by God’s Word? <a href="/channels/growth/bb-receiving-insights">[more]</a>',
        '<strong>Obeying God Faithfully:</strong> Is there a significant gap between what is known and practiced—areas of compromise, selective obedience, or hesitation to fully follow Christ? <a href="/channels/growth/bb-obeying-god">[more]</a>',
        '<strong>Living as God’s Family:</strong> Do they show genuine care and support for their church family, or do they exhibit isolation and superficial connections? <a href="/channels/growth/bb-living-family">[more]</a>',
        '<strong>Reaching the World:</strong> Are they primarily focused on themselves, or is there an emphasis on sharing the gospel and making disciples? <a href="/channels/growth/bb-reaching-world">[more]</a>',
        '<strong>Resisting the Enemy:</strong> Are they alert to spiritual opposition, or do they seem discouraged and easily distracted by temptation and accusation? <a href="/channels/growth/bb-resisting-enemy">[more]</a>',
        '<strong>Pursuing God’s Master Plan:</strong> Do they feel their lives have a purposeful direction under God’s guidance, or do they seem uncertain about their calling and how to use their gifts for His glory? <a href="/channels/growth/bb-pursuing-master-plan">[more]</a>',
      ]},
      { type: "p", html: "These questions are meant to encourage careful observation and discernment, not quick judgments. As the Holy Spirit provides clarity, the foundational element that emerges can guide teaching and discipleship in this season." },
    ],
  },

  {
    id: "aids-that-strengthen-lasting-retention",
    title: "Aids That Strengthen Lasting Retention",
    description:
      "Practical aids — one central truth, simple structure, purposeful visuals, minimal notes, and active engagement — that help sermons take deeper root and bear fruit.",
    unlisted: true,
    blocks: [
      { type: "p", html: "Several practical aids can strengthen sermon retention by working with the mind’s natural limits rather than against them." },
      { type: "p", html: "A single, clearly stated central truth remains the foundation. When the entire message orbits one main idea, the hearer has a secure place to anchor what is heard. Supporting this truth with a simple, memorable structure—perhaps three short movements or a clear progression—further reduces mental effort and makes the message easier to recall later." },
      { type: "p", html: "Thoughtful use of visuals can help, provided they remain simple and directly supportive of the central point. A single image, a brief outline on the screen, or a key verse displayed at the right moment can engage the visual channel without creating distraction. Conversely, dense slides or decorative elements often increase cognitive load and hinder retention." },
      { type: "p", html: "Sermon notes, when carefully designed, serve a similar purpose. Sparse notes that highlight the main truth and mirror the sermon’s clear structure act as an external support, freeing the listener from the burden of organizing everything mentally. A few open spaces for personal reflection can also encourage active processing. Yet notes that are overly detailed or crowded force constant shifts of attention between listening and writing, raising extraneous load and reducing the very retention they aim to support. The most helpful notes remain minimal and purposeful." },
      { type: "p", html: "Active engagement further deepens memory. Brief pauses that invite personal reflection, a well-placed question, or a concrete call to a specific step of obedience move the listener from passive hearing toward thoughtful response. Concrete illustrations and real-life examples strengthen this process by linking abstract truth to lived experience." },
      { type: "p", html: "Beyond the sermon itself, simple follow-up tools extend the work. A concise handout, small-group discussion guides, or a short memory verse for the week all give the Spirit additional opportunity to plant the Word more firmly." },
      { type: "p", html: "In each case, the aim is the same: to protect the hearer’s limited mental resources so that the truth may take deeper root and bear lasting fruit." },
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
