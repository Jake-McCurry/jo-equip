export interface PlaylistVideo {
  title: string;
  videoId: string;
}

export interface Playlist {
  id: string;
  title: string;
  playlistId: string;
  /** Optional override: which video's thumbnail to use as the playlist cover. Defaults to the first non-empty videoId. */
  thumbnailVideoId?: string;
  videos: PlaylistVideo[];
}

const yt = (videoId: string) => videoId;

/* Display order — playlists render in this order on /playlists. */
export const playlists: Playlist[] = [
  {
    id: "science-and-the-origin-of-life",
    title: "Science and The Origin of Life",
    playlistId: "PLyI_AdjR33H1Bgpp_i6LAG4zN8lHZnIII",
    videos: [
      { title: "Did the Universe Have A Beginning?", videoId: yt("-z8D-mutYUg") },
    ],
  },
  {
    id: "who-is-the-real-jesus",
    title: "Who Is the Real Jesus?",
    playlistId: "PLyI_AdjR33H2UgV-CTQ_pAfL4t32naQRo",
    videos: [
      { title: "Who is the Real Jesus?", videoId: yt("BVxw0pojBHM") },
      { title: "Was Jesus a Real Person?", videoId: yt("vQ0Wro-Rgtw") },
      { title: "Did Jesus Rise from the Dead?", videoId: yt("T_78mbFTmYY") },
      { title: "Is Jesus God?", videoId: yt("9pIWZfEAV0I") },
      { title: "Is Jesus Relevant To You?", videoId: yt("B9ODEIAUVQc") },
      { title: "Who is the Jewish Messiah?", videoId: yt("Jn1M1c9iNfg") },
      { title: "Is There a Jesus Conspiracy?", videoId: yt("kci8WYFedOQ") },
    ],
  },
  {
    id: "facts-for-faith",
    title: "Facts for Faith",
    playlistId: "PLyI_AdjR33H0d3GB3ihbUnoBUmtVhiXQh",
    videos: [
      { title: "Jesus On Trial", videoId: yt("8mqGQrW1Q0A") },
      { title: "Did Jesus Rise From the Dead?", videoId: yt("dCVp33xhsJY") },
      { title: "Who is the Real Jesus?", videoId: yt("sm-KC7rflJ8") },
    ],
  },
  {
    id: "meet-jesus",
    title: "Meet Jesus",
    playlistId: "PLyI_AdjR33H1H7yrGOr5-nQOO5T0OV8_r",
    videos: [
      { title: "Jesus Resurrection and You", videoId: yt("SEg4a2xaJyw") },
      { title: "The Real Jesus and You", videoId: yt("6d0st8L44Mo") },
      { title: "Purpose For Life", videoId: yt("1ngNjwYu83o") },
      { title: "Begin the Relationship", videoId: yt("wzkaO_XIdmY") },
      { title: "Gift of Heaven", videoId: yt("XB7wGTnYeaE") },
    ],
  },
  {
    id: "life-in-the-spirit",
    title: "Life In The Spirit",
    playlistId: "PLyI_AdjR33H3LfKBYy-vyP3eFt5GIS04z",
    videos: [
      { title: "Be Sure You're A Christian (1)", videoId: yt("jyrfnhJ7im8") },
      { title: "Be Sure You're A Christian (2)", videoId: yt("00p-3kawbps") },
      { title: "Be Sure You're A Christian (3)", videoId: yt("MtbBfCongQg") },
      { title: "Be Sure You're A Christian (4)", videoId: yt("PlQQ203hrXA") },
      { title: "Experience God's Love (1)", videoId: yt("1IXa5MxBIKc") },
      { title: "Experience God's Love (2)", videoId: yt("1EE08x4-_z8") },
      { title: "Experience God's Love (3)", videoId: yt("YJ2sady9plY") },
      { title: "Experience God's Love (4)", videoId: yt("fsUU6Fep75E") },
      { title: "Be Filled with the Holy Spirit (1)", videoId: yt("R-x5yIGCmm0") },
      { title: "Be Filled with the Holy Spirit (2)", videoId: yt("zDl4o8tdHRE") },
      { title: "Be Filled with the Holy Spirit (3)", videoId: yt("M9JPkpg8M00") },
      { title: "Be Filled with the Holy Spirit (4)", videoId: yt("7dFf4QM1h0s") },
      { title: "Walk in the Spirit: Be Sure You are Filled with the Holy Spirit (1)", videoId: yt("B_jbfBITH4Q") },
      { title: "Walk in the Spirit: Be Prepared for Spiritual Conflict (2)", videoId: yt("dh1im2sOc_c") },
      { title: "Walk in the Spirit: Know Your Resources as a Child of God (3)", videoId: yt("Wh4Zv2dAy_4") },
      { title: "Walk in the Spirit: Faith Blocks Illustration (4)", videoId: yt("LiqyRCRlItA") },
    ],
  },
  {
    id: "total-life-discipleship-core-principles",
    title: "Total Life Discipleship Core Principles",
    playlistId: "PLyI_AdjR33H3yAO7F9M4tJoq9EwU7Afmc",
    videos: [
      { title: "What Is Total Life Discipleship?", videoId: yt("XU3PUCwaKos") },
      { title: "Total Life Discipleship: God's Vision", videoId: yt("psw_5rn9WFY") },
      { title: "Total Life Discipleship: Personal Transformation", videoId: yt("56GWpb0F2qU") },
      { title: "Total Life Discipleship: Eternal Impact", videoId: yt("Wq2g9GTgc_Q") },
      { title: "Total Life Discipleship: Kingdom Maturity", videoId: yt("ysSDA-Aq_ck") },
      { title: "Total Life Discipleship: Kingdom Faith", videoId: yt("M2rPlUzj50Y") },
      { title: "Total Life Discipleship: Kingdom Power - Be Filled with the Holy Spirit", videoId: yt("E78uWvxZOOM") },
      { title: "Total Life Discipleship: Kingdom Power - Walk in the Spirit", videoId: yt("S-4pXuEF1FI") },
      { title: "Total Life Discipleship: Kingdom Prayer - Topics", videoId: yt("MtX-fFMtXG4") },
      { title: "Total Life Discipleship: Kingdom Prayer - Building Blocks", videoId: yt("E46dx0kLSRQ") },
      { title: "Total Life Discipleship: Kingdom Promises", videoId: yt("You5ArBCx1U") },
      { title: "Total Life Discipleship: Kingdom Authority", videoId: yt("gAInNUwcbpU") },
    ],
  },
  {
    id: "hope-in-times-of-crisis",
    title: "Hope in Times of Crisis",
    playlistId: "PLyI_AdjR33H0zgKEjJe7unAxY_wJgtqDp",
    videos: [
      { title: "Hope in Times of Crisis", videoId: yt("cIATt88b_MM") },
      { title: "God is Greater Than You Think", videoId: yt("j6NDvGvLgDU") },
      { title: "God Loves You More Than You Know", videoId: yt("xM-SlFmGQps") },
      { title: "God Keeps His Promises", videoId: yt("WQpQlkFMwgk") },
      { title: "God is Dependable", videoId: yt("SsEQ8L5RoLM") },
      { title: "God Is Always With You", videoId: yt("wgUGXg91NPg") },
      { title: "God Promises Good Out of Bad", videoId: yt("bjnBFHzL-Hw") },
      { title: "God is Blessing You Today", videoId: yt("qTMh6RkueNw") },
      { title: "God Provides for You Daily", videoId: yt("bVm3Zm5Xv1A") },
      { title: "God Has a Good Plan for You", videoId: yt("VpqNXJVi6NY") },
      { title: "God Guides Your Steps", videoId: yt("Pu5ta7Bl648") },
      { title: "God Responds to Prayer", videoId: yt("RnamB7uZn4M") },
      { title: "God's Help is on the Way", videoId: yt("Z4oCJS7dvu4") },
      { title: "God Offers Supernatural Power", videoId: yt("FXSnt4LeW1U") },
      { title: "God Offers Supernatural Freedom", videoId: yt("Efoi9DlbNQo") },
      { title: "God Offers Supernatural Peace", videoId: yt("AXVd8O3MI84") },
      { title: "Growing in Tough Times", videoId: yt("QE1p8oMHTfk") },
    ],
  },
  {
    id: "7-habits-deeper-relationship-with-god",
    title: "7 Habits For A Deeper Relationship with God",
    playlistId: "PLyI_AdjR33H18w4zfuE19QcXxmlN5yx82",
    videos: [
      { title: "7 Habits for a Deeper Relationship with God", videoId: yt("c2QgWzLjLco") },
      { title: "Habit 1: Desire God", videoId: yt("93VUhqo3a88") },
      { title: "Habit 2: Pursue God", videoId: yt("jlq4GkQZ3QE") },
      { title: "Habit 3: Know God", videoId: yt("bYVOjn8mVWo") },
      { title: "Habit 4: Love God", videoId: yt("_G0lQpgnEcI") },
      { title: "Habit 5: Fear God", videoId: yt("5uXmsw4MrWY") },
      { title: "Habit 6: Trust God", videoId: yt("2ulB10dIyZ0") },
      { title: "Habit 7: Enjoy God", videoId: yt("Ng8Y_CcC7I0") },
    ],
  },
  {
    id: "experience-gods-love",
    title: "Experience God's Love",
    playlistId: "PLyI_AdjR33H2QGFYfEe25zF0MRwJOaTi7",
    thumbnailVideoId: yt("Kd4wxIqjCz8"),
    videos: [
      { title: "You Are Precious To God", videoId: yt("_OK277lraUg") },
      { title: "God, Know My Heart", videoId: yt("w_UUB6dDU60") },
      { title: "Everlasting Lovingkindness", videoId: yt("YxQQqnHaN6E") },
      { title: "God Is Love", videoId: yt("Kd4wxIqjCz8") },
      { title: "Born To Be Loved", videoId: yt("l9zLcyKtZn0") },
    ],
  },
];

export function playlistUrl(p: Playlist): string {
  return `https://www.youtube.com/playlist?list=${p.playlistId}`;
}

export function playlistThumbnail(p: Playlist): string {
  const id = p.thumbnailVideoId || p.videos.find(v => v.videoId)?.videoId;
  if (!id) return "";
  return `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
}
