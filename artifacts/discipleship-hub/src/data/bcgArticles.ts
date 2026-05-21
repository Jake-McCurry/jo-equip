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
}

const REGISTER_CTA: ArticleBlock = {
  type: "p",
  html: '<strong>Register today to become a FREE JesusOnline EQUIPPED Church.</strong> <a href="/newsletter">Sign up for updates →</a>',
};

export const bcgArticles: BcgArticle[] = [
  {
    id: "gods-unique-vision-for-your-church",
    title: "God’s Unique Vision for Your Church",
    description:
      "Faithful pastor or small-church leader feeling stuck? JesusOnline offers free media and discipleship resources to help you grow deep — God will grow you wide.",
    blocks: [
      { type: "figure", src: "bgc1-1", alt: "Opening illustration for God’s Unique Vision for Your Church — a faithful shepherd and the flock God has entrusted to him." },

      { type: "p", html: "Are you a faithful church leader or small congregation feeling stuck? You’re pouring everything into ministry, yet the church isn’t growing the way you hoped." },
      { type: "p", html: "JesusOnline is here to help." },
      { type: "p", html: "We don’t offer quick-fix formulas or worldly church-growth strategies. Instead, we provide high-quality free media and discipleship resources designed to help you feed and shepherd the flock God has already entrusted to you." },
      { type: "figure", src: "bgc1-2", alt: "JesusOnline’s free media and discipleship resources — practical tools to help pastors feed and shepherd their flock." },

      { type: "h2", text: "Our Core Philosophy" },
      { type: "p", html: "<strong>Grow deep. God will grow you wide.</strong>" },
      { type: "p", html: "We believe real success in God’s Kingdom is measured first by depth, not numbers. When disciples are rooted in Christ, transformed by His Word, and equipped to follow Him daily, healthy growth follows naturally. Healthy sheep reproduce. Healthy flocks expand." },

      { type: "p", html: "That’s why our resources focus on:" },
      { type: "ul", items: [
        "Biblical teaching that builds mature believers",
        "Engaging media that makes truth accessible and life-changing",
        "Practical discipleship tools that help your people thrive right where God has planted them",
      ]},

      { type: "p", html: "We’re not promising explosive numerical growth. These are tools, not magic. But we are confident that when you minister God’s way — caring for the sheep, preaching the Word, and making disciples — He is faithful to bless the work." },
      { type: "p", html: "Isn’t it reasonable to expect that if you pour yourself into faithful, biblical ministry, the Lord of the Harvest will bring the increase in His perfect timing?" },
      { type: "figure", src: "bgc1-3", alt: "The Lord of the Harvest brings the increase in His perfect timing." },

      { type: "h2", text: "Let’s Build Christ’s Kingdom Together" },
      { type: "p", html: "If you’re a pastor or church leader who wants to focus on depth over hype, we’d love to partner with you." },
      { type: "p", html: "Whether your church is small, rural, urban, or somewhere in between — your flock matters to God. Let us help you strengthen and equip them." },
      { type: "figure", src: "bgc1-4", alt: "Partnering with pastors and church leaders to strengthen and equip the flock God has entrusted to them." },

      { type: "h2", text: "Ready to go deeper?" },
      { type: "p", html: "Explore the articles below to see how JesusOnline can help your church become:" },
      { type: "ul", items: [
        '<a href="/channels/church/become-growing-church/a-jesusonline-equipped-church">A JesusOnline EQUIPPED Church</a>',
        '<a href="/channels/church/become-growing-church/a-total-life-discipleship-church">A Total Life Discipleship Church</a>',
        '<a href="/channels/church/become-growing-church/a-transformational-teaching-church">A Transformational Teaching Church</a>',
        "A Spirit-dependent Church",
        "A Hope-filled Church",
        "A Focused Worship Church",
        "A Love-demonstrating Relational Church",
        "A Great Commission Church",
        "An Online Outreach Church",
        "An Attractive and Inviting Church",
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
      { type: "p", html: "We don’t offer trendy church-growth formulas or worldly success strategies. Instead, we provide high-quality, free media and discipleship resources created specifically to help you faithfully feed and shepherd the flock God has entrusted to you." },
      { type: "figure", src: "bgc2-3", alt: "Totally free, high-quality media and discipleship resources for the local church." },

      { type: "p", html: "<strong>JO EQUIP</strong> is a free digital library of practical discipleship tools for pastors and ministry leaders — carefully organized into three purpose-driven channels so you can find exactly what you need, when you need it." },
      { type: "p", html: "JesusOnline offers free <em>Watch → Learn → Live</em> resources to strengthen engagement, depth, and retention in your ministry." },
      { type: "figure", src: "bgc2-4", alt: "The Watch → Learn → Live model — short videos, deeper teaching articles, and practical life application." },

      { type: "h2", text: "A Simple 5-Step Process for a Sermon, Bible Study, or Discipleship Group" },
      { type: "ol", items: [
        "<strong>Select a Topic.</strong> Browse the JO EQUIP library and choose a topic that fits your upcoming message (from Evidence, Growth, or Church channels).",
        "<strong>Build Your Message.</strong> Use the article as your skeleton outline or rich resource material. Embellish it with your own illustrations, personal stories, pastoral insights, and relevant examples from your congregation. The content is biblical, trustworthy, and ready to save you hours of preparation.",
        "<strong>Capture Attention Immediately.</strong> Play the summary video at the very beginning of your message. It sets the emotional tone, gives people a clear preview of where you’re going, and draws in even distracted or first-time visitors.",
        "<strong>Deliver Your Teaching.</strong> Communicate with freedom and confidence, knowing the core content is solid and well-researched.",
        "<strong>Extend the Impact.</strong> At the end of your message, share a specific link (or QR code) from the JesusOnline app that takes people directly to the article and related resources you used. They can now review the main points, reflect deeper, answer discussion questions, and apply the truth — all on their phones. It becomes their personal takeaway notes and discipleship tool for the week.",
      ]},
      { type: "figure", src: "bgc2-5", alt: "The 5-step process: Select → Build → Capture → Deliver → Extend — turning one sermon into an ongoing discipleship experience." },

      { type: "h2", text: "Why Pastors Love This Approach" },
      { type: "ul", items: [
        "Saves significant preparation time",
        "Provides high-quality, biblically faithful, transformational content",
        "Increases engagement during the service",
        "Dramatically improves retention and real-life application",
        "Turns one sermon into an ongoing discipleship experience",
      ]},
      { type: "figure", src: "bgc2-6", alt: "Why pastors love this approach — saved prep time, deeper engagement, and lasting retention." },

      { type: "p", html: "All resources are completely free, mobile-friendly, and thoughtfully created with the real challenges of small-church ministry in mind." },
      { type: "p", html: 'Visit <a href="/">JO EQUIP</a> today and explore the channels.' },
      { type: "p", html: "We’d love to partner with you. Let’s build Christ’s kingdom together. Lead your church to become all God wants it to be so it can do all God wants it to do." },
      REGISTER_CTA,
      { type: "figure", src: "bgc2-7", alt: "Closing illustration — partnering together to build Christ’s kingdom." },
    ],
  },

  {
    id: "a-total-life-discipleship-church",
    title: "A Total Life Discipleship Church",
    description:
      "Saved by grace, formed for obedience. A grace-based, Spirit-dependent path to disciples who actually obey all Jesus commanded — through knowledge, motivation, and practical methodology.",
    blocks: [
      { type: "quote", html: "Teach these new disciples to obey all the commands I have given you. …", cite: "Matthew 28:20, NLT" },
      { type: "figure", src: "bgc3-1", alt: "The Great Commission — making disciples who obey all that Jesus commanded." },

      { type: "p", html: "Jesus’ final charge in the Great Commission calls the church not merely to make converts but to form disciples who obey all that He commanded. This mission raises honest questions for every believer: If salvation is by grace through faith and not by works, why does obedience matter? How do we move beyond inspiration to actual transformation? And how can we live out this obedience in every sphere of life?" },

      { type: "h2", text: "Saved by Grace, Formed for Obedience" },
      { type: "figure", src: "bgc3-2", alt: "Saved by grace, formed for obedience — Ephesians 2:8–10." },
      { type: "p", html: "Scripture settles the tension between grace and obedience with beautiful clarity. Ephesians 2:8–10 reminds us:" },
      { type: "quote", html: "God saved you by his grace when you believed… Salvation is not a reward for the good things we have done… For we are God’s masterpiece. He has created us anew in Christ Jesus, so we can do the good things he planned for us long ago." },
      { type: "p", html: "We are saved by grace alone, through faith alone. Nothing we do earns or maintains this gift. Yet the same passage declares that we are saved <em>for</em> good works. Obedience is not the root of salvation; it is the natural fruit of a life made new in Christ. Genuine faith produces change (James 2:14–26), and love for Jesus expresses itself in keeping His commands (John 14:15)." },
      { type: "p", html: "Total Life Discipleship embraces this gospel reality. It rejects both self-reliant legalism and passive faith that never bears fruit. Instead, it equips believers to obey through three essentials: knowledge of Christ’s commands, motivation rooted in love, and practical methodology for daily obedience." },

      { type: "h2", text: "The Three Essentials of Obedience" },
      { type: "figure", src: "bgc3-3", alt: "The three essentials of obedience — Knowledge, Motivation, and Methodology." },
      { type: "p", html: "Obedience rarely fails for just one reason. A practical framework helps diagnose where we get stuck:" },

      { type: "h3", text: "1. Knowledge — Do I know what Jesus actually commanded?" },
      { type: "p", html: "You cannot obey what you do not know. The Great Commission requires teaching the full scope of Jesus’ words: how to handle anger, lust, money, forgiveness, prayer, and love for enemies. Regular reading of the Gospels, systematic Bible study, and clear preaching build this foundation." },

      { type: "h3", text: "2. Motivation — Do I desire to obey?" },
      { type: "p", html: "Head knowledge is not enough. The heart must want to follow. The gospel fuels this desire by reminding us of God’s love, Christ’s sacrifice, and the new heart He gives (Ezekiel 36:26–27). When love for Jesus grows, obedience shifts from drudgery to delight. Gratitude replaces guilt as the primary driver." },

      { type: "h3", text: "3. Methodology — Do I know how to obey?" },
      { type: "p", html: "Many believers know what to do and even want to do it and yet feel stuck. This is where practical instruction is vital." },
      { type: "ul", items: [
        "<em>“Do not be anxious”</em> (Philippians 4:6) becomes doable through specific prayer rhythms, thanksgiving, and renewing the mind.",
        "<em>“Love your enemies”</em> is lived out by praying for them and serving them practically.",
        "<em>“Flee sexual immorality”</em> requires habits like accountability and guarding inputs.",
      ]},
      { type: "p", html: "The New Testament is rich in both commands and the “how-to” wisdom that follows." },
      { type: "p", html: "When any of these three is missing, obedience falters. Many failures trace back to motivation (the heart). Others want to obey but fail because they rely on self-effort. They never learned <em>how</em> to obey." },

      { type: "h2", text: "Exhortation vs. Teaching: Why Sermons Often Leave Us Inspired but Unchanged" },
      { type: "figure", src: "bgc3-4", alt: "Exhortation versus teaching — stirring the heart and equipping the hands." },
      { type: "p", html: "Preaching typically includes two complementary elements:" },
      { type: "ul", items: [
        "<strong>Exhortation</strong> stirs the heart, appeals to the will, and urges action with passion, encouragement, or warning.",
        "<strong>Teaching</strong> explains truth, clarifies meaning, and equips with practical methodology. It addresses the head and hands.",
      ]},
      { type: "p", html: "Jesus and the apostles used both. Paul often taught deep doctrine for chapters before saying, “Therefore… live this way.”" },
      { type: "p", html: "Many modern sermons lean heavily on exhortation. Passionate calls to “obey God!” or “step out in faith!” feel urgent and emotionally powerful. But without clear methodology, listeners leave motivated yet unequipped. They know they should forgive, pray more, or resist sin — but not <em>how</em> when the pain is fresh or the habit is entrenched. The result is repeated frustration and, eventually, cynicism." },
      { type: "p", html: "Healthy discipleship preaching balances all three elements of obedience: clear knowledge of the command, gospel motivation rooted in grace, and practical steps for daily life." },
      { type: "p", html: "Total Life Discipleship offers a clear and compelling answer. It is a grace-filled journey that invites every believer to align their entire existence with God’s eternal purposes. Far from a burdensome program, it begins with God’s vision of us, leads to personal transformation into the likeness of Christ, and flows outward into eternal impact for His kingdom. At its heart, this discipleship is relationship-centered, grace-based, Spirit-dependent, love-motivated, and biblically focused." },
      { type: "figure", src: "bgc3-5", alt: "The grace-filled journey of Total Life Discipleship — God’s vision, personal transformation, and eternal impact." },

      { type: "h2", text: "God’s Vision: Seeing Life from His Perspective" },
      { type: "p", html: "Every journey of discipleship must begin where God begins — with His loving vision of us." },
      { type: "p", html: "Our heavenly Father sees not our failures or frailties but the finished work of His Son. <em>“Anyone who belongs to Christ has become a new person. The old life is gone; a new life has begun!”</em> (2 Corinthians 5:17, NLT)." },
      { type: "p", html: "He knit each of us together with intentional care (Psalm 139:13–14). Our personalities, strengths, and even our weaknesses serve His design. Before we drew our first breath, He set us apart for kingdom purposes (Jeremiah 1:5). When we rest in His unwavering love — <em>“Abide in My love”</em> (John 15:9) — circumstances lose their power to define us. We begin to view ourselves, others, and our daily paths through the clarifying light of His truth." },
      { type: "p", html: "This vision is foundational to obedience. It renews our minds with God’s perspective, replacing worldly lies with biblical truth and grounding every command in His fatherly care." },

      { type: "h2", text: "Personal Transformation: Becoming the Person God Created You to Be" },
      { type: "p", html: "God’s vision is meant to be lived. Transformation begins at the moment of salvation, when our old identity is exchanged for a new one in Christ (Ephesians 4:21–24). Yet this new life unfolds as a lifelong process of renewal by the Holy Spirit." },
      { type: "p", html: "True change touches the core of our character — our values, convictions, and responses. <em>“Let God transform you into a new person by changing the way you think”</em> (Romans 12:2, NLT). Trials refine us, building endurance and trust so that we reflect more of Christ’s nature (Romans 5:3–4; 8:28). As we comprehend the breadth, length, depth, and height of God’s love, we are filled with His fullness (Ephesians 3:17–19). Love received becomes love reflected." },
      { type: "p", html: "Grace softens our hearts, the Spirit stirs holy desires, and gratitude for Christ’s sacrifice replaces guilt or duty. Obedience shifts from burden to joyful response." },

      { type: "h2", text: "Eternal Impact: Pursuing God’s Master Plan" },
      { type: "p", html: "A life transformed by God naturally bears lasting fruit. We were created <em>“to do the good things He planned for us long ago”</em> (Ephesians 2:10). Our days are not accidental; God has placed us in this generation with specific gifts, experiences, and relationships to advance His kingdom." },
      { type: "p", html: "Eternal impact flows from obedient partnership with the Lord — dependent on the Holy Spirit rather than frantic self-effort. <em>“I can do all things through Christ who gives me strength”</em> (Philippians 4:13). We steward time, talent, and treasure for heaven’s sake, investing in what matters to God and storing up treasures that never fade (Matthew 6:21)." },
      { type: "p", html: "Total Life Discipleship provides practical wisdom for living out Christ’s commands in relationships, work, trials, and mission — equipping us not only to know and desire obedience but to walk in it daily." },

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
      { type: "p", html: "Total Life Discipleship is not a program to complete but a daily invitation to walk closely with the One who formed you, redeemed you, and calls you by name. As you behold His vision, yield to His transforming work, and step into His purposes, your life will echo with eternal significance." },

      { type: "h2", text: "Free JesusOnline Watch → Learn → Live Resources" },
      { type: "p", html: "<strong>Capture attention immediately</strong> with a powerful video clip to introduce your message. A well-chosen video sets the emotional tone, illustrates the theme, and draws people in from the very first moment." },
      { type: "p", html: "<strong>Deepen your content</strong> by weaving key insights from the article into your teaching. Use it as rich resource material to add credibility, fresh perspectives, and biblical connections to your sermon." },
      { type: "p", html: "<strong>Drive lasting impact</strong> by sharing the app link at the end of your message. This simple tool helps your people review, remember, and apply the core essence of the sermon long after they leave the service." },

      { type: "h3", text: "Total Life Discipleship" },
      { type: "ul", items: [
        "Core Principles (PDF • Video • App)",
        "Kingdom Mentality (PDF • Video • App)",
        "Building Blocks for Maturity (PDF • Video • App)",
      ]},

      REGISTER_CTA,
      { type: "figure", src: "bgc3-7", alt: "A daily invitation to walk closely with Christ — closing illustration." },
    ],
  },

  {
    id: "a-transformational-teaching-church",
    title: "A Transformational Teaching Church",
    description:
      "Three complementary teaching objectives — head, hands, and heart — and the three foundational truths that produce lasting heart change in the believers you shepherd.",
    blocks: [
      { type: "figure", src: "bgc4-1", alt: "Opening illustration for A Transformational Teaching Church — equipping believers through God’s Word." },

      { type: "p", html: "As a pastor or church leader, as you shepherd your flock, it is wise to reflect on how the Lord equips His people through His Word. Scripture calls us not only to know the truth, but to live it out and be transformed by it." },
      { type: "figure", src: "bgc4-2", alt: "Knowing the truth, living it out, and being transformed by it — the threefold call of Scripture." },
      { type: "p", html: "There are three distinct yet complementary teaching objectives and sermon approaches:" },

      { type: "h2", text: "1. Bible Knowledge (The Head)" },
      { type: "p", html: "This is the foundational, verse-by-verse expository teaching that builds a solid understanding of Scripture. It focuses on what the Bible says — its history, context, doctrines, and accurate interpretation. The goal is biblical literacy and doctrinal soundness so that God’s people may <em>“know the truth”</em> (John 8:32)." },

      { type: "h2", text: "2. Life Application (The Hands)" },
      { type: "p", html: "This approach draws practical principles and examples from Scripture and shows how they apply to everyday life. It answers the question, <em>How should we live?</em> It equips believers to obey God’s Word in their relationships, work, decisions, and daily challenges. This is the bridge between knowledge and action." },

      { type: "h2", text: "3. Transformational Discipleship (The Heart)" },
      { type: "p", html: "This is the deepest and most vital level of biblical teaching. It moves beyond the transmission of information or even the application of principles to focus on the foundational core truths of the Gospel that produce genuine heart change and lasting transformation." },
      { type: "p", html: "Total Life Discipleship is a lifelong journey of following Jesus Christ so that we become all that God created us to be and do all that He created us to do. It intentionally forms Christlike character, renews the mind with God’s perspective, and cultivates a fully surrendered heart." },
      { type: "p", html: "At its core, Total Life Discipleship rests on three essential truths that few churches teach with clarity and balance. When rightly understood and applied, they reshape how believers see God, themselves, and the daily Christian life." },
      { type: "figure", src: "bgc4-3", alt: "Three foundational truths — the character of God, our new identity in Christ, and the ministry of the Holy Spirit." },

      { type: "h2", text: "Three Foundational Truths" },

      { type: "h3", text: "1. The Full Character and Nature of God" },
      { type: "p", html: "Our view of God’s character and attributes shapes everything else in our lives — our worship, our trust, our obedience, and our responses to trials. While God’s attributes are often mentioned in sermons, they are rarely taught as a complete, balanced whole. The result is a fragmented, sometimes distorted image of God." },
      { type: "p", html: "For example, when we elevate His love above His holiness and justice — or any other attribute at the expense of the others — we no longer see the God of Scripture. A true vision of God in all His glory (merciful yet righteous, loving yet sovereign) becomes the foundation for healthy fear of the Lord, deep worship, and transformed living." },

      { type: "h3", text: "2. Our New Identity in Christ" },
      { type: "p", html: "At the very moment a person is born again, Scripture declares that <em>“the old has passed away; behold, the new has come”</em> (2 Corinthians 5:17). In Christ, believers are no longer defined by their past or their failures. They are a brand-new creation with a new position, a new identity, and a new self-image." },
      { type: "p", html: "Yet this profound truth is seldom taught clearly. The Apostle Paul routinely addressed ordinary first-century believers as <em>“saints.”</em> When we see ourselves primarily as “sinners saved by grace,” we tend to live like sinners. But when we grasp that in God’s eyes we are now saints — righteous in Christ — holy living becomes the new normal. Sin is no longer our identity; it is an intruder to be rejected and put to death because it is foreign to who we truly are in Christ." },

      { type: "h3", text: "3. The Ministry and Power of the Holy Spirit" },
      { type: "p", html: "The Holy Spirit has been given to every believer to dwell within them, empower them, comfort them, convict them, and guide them into all truth. He is not a distant force but a personal Helper who enables us to live the Christian life as God intends." },
      { type: "p", html: "Tragically, many believers have little understanding of the Spirit’s various ministries or how to cooperate with Him daily. Without this knowledge, they are left striving in their own strength — only to experience repeated frustration, burnout, and defeat. True discipleship teaches believers how to walk by the Spirit, rely on His power, and yield to His leading moment by moment." },
      { type: "p", html: "These three foundational truths — who God is, who we are in Christ, and how the Holy Spirit helps us — form the bedrock of Total Life Discipleship. When they are clearly taught and deeply embraced, the Holy Spirit uses them to produce lasting heart change and Christlike maturity." },
      { type: "p", html: "The result is not merely informed or active believers, but those who are radically transformed from the inside out so that Christ is formed in them (Romans 12:2; Galatians 4:19). This holistic approach equips the church to overcome sin patterns, cultivate godly character, and live with eternal impact right where God has placed His people." },

      { type: "h2", text: "A Balanced Ministry" },
      { type: "p", html: "A healthy, thriving church embraces all three dimensions of biblical teaching. Teaching that remains only in the head may produce knowledgeable believers who remain largely unchanged. Teaching that emphasizes life application without sufficient depth can become shallow or moralistic." },
      { type: "p", html: "Yet when Bible Knowledge, Life Application, and Transformational Discipleship work together in harmony, the Holy Spirit uses God’s Word to renew the whole person — head, hands, and heart — for His glory." },
      { type: "p", html: "This integrated approach lies at the very heart of what JesusOnline seeks to support. Our resources are designed especially to strengthen the third dimension — Total Life Discipleship — while honoring and building upon faithful expository teaching and practical application." },
      { type: "p", html: "By grounding God’s people in the full character of God, their new identity in Christ, and the empowering ministry of the Holy Spirit, we can help churches move beyond surface-level growth into the deep, lasting transformation that pleases the Lord and bears eternal fruit." },

      { type: "h2", text: "Free JesusOnline Watch → Learn → Live Resources" },
      { type: "figure", src: "bgc4-4", alt: "Free JesusOnline Watch → Learn → Live resources — short videos, deeper articles, and practical application." },
      { type: "p", html: "<strong>Capture attention immediately</strong> with a powerful video clip to introduce your message. A well-chosen video sets the emotional tone, illustrates the theme, and draws people in from the very first moment." },
      { type: "p", html: "<strong>Deepen your content</strong> by weaving key insights from the article into your teaching. Use it as rich resource material to add credibility, fresh perspectives, and biblical connections to your sermon." },
      { type: "p", html: "<strong>Drive lasting impact</strong> by sharing the app link at the end of your message. This simple tool helps your people review, remember, and apply the core essence of the sermon long after they leave the service." },

      { type: "h3", text: "From Building Blocks for Maturity" },
      { type: "ul", items: [
        "God’s Majestic Qualities (PDF • Video • App)",
        "Your New Identity, Overview (PDF • Video • App)",
        "Walking by the Spirit (PDF • Video • App)",
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
];

export function getBcgArticle(id: string): BcgArticle | undefined {
  return bcgArticles.find(a => a.id === id);
}

/** Returns the next published BCG article (the one right after `id`), wrapping to first. */
export function getNextBcgArticle(id: string): BcgArticle | undefined {
  if (bcgArticles.length < 2) return undefined;
  const idx = bcgArticles.findIndex(a => a.id === id);
  if (idx === -1) return undefined;
  return bcgArticles[(idx + 1) % bcgArticles.length];
}
