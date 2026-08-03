/**
 * Shared "end page" appended to every generated JO EQUIP PDF (WordPress
 * articles, Become-a-Growing-Church articles, and Bible Study Methods
 * articles). Content is sourced from the "PDF End Page" doc: a thank-you,
 * a review/feedback prompt, a "discover more free resources" list, a share
 * encouragement, and a closing sign-off.
 *
 * Both consts are string-interpolated into each generator's own
 * renderTemplate():
 *   • END_PAGE_CSS  → injected just before the closing </style>
 *   • END_PAGE_HTML → injected just before the closing </body>, after the
 *                     <section class="article"> block.
 *
 * Styles are self-contained under the `.end-page` scope (they do not rely on
 * any of the per-template classes) and reuse the shared brand palette:
 *   navy #0b3c5d · blue #0083de · orange #de5b00 · link #b34800.
 */

export const END_PAGE_CSS = `
  /* Shared PDF end page */
  .end-page {
    page-break-before: always;
    padding-top: 0.1in;
  }
  .end-page .ep-header {
    font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
    margin-bottom: 0.8em;
    line-height: 1.15;
  }
  .end-page .ep-brand {
    display: block;
    font-size: 15pt; font-weight: 700;
    color: #0b3c5d; letter-spacing: -0.005em;
  }
  .end-page .ep-brand-tag {
    display: block; margin-top: 0.15em;
    font-size: 9.5pt; color: #6b7280;
  }
  .end-page .ep-title {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 22pt; line-height: 1.2;
    color: #0b3c5d; font-weight: normal;
    margin: 0.2em 0 0 0;
  }
  .end-page .ep-rule {
    display: block; width: 96px; height: 4px;
    background: #de5b00; margin: 0.3in 0 0.28in 0;
  }
  .end-page .ep-lead { font-size: 12pt; color: #1f2937; margin: 0 0 1em 0; }
  .end-page h2 {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 14pt; color: #0b3c5d; font-weight: 600;
    margin: 1.4em 0 0.35em; page-break-after: avoid;
  }
  .end-page p { margin: 0 0 0.85em 0; orphans: 3; widows: 3; }
  .end-page a { color: #b34800; text-decoration: underline; }
  .end-page strong { color: #0b3c5d; }
  .end-page ul { margin: 0.5em 0 1em 1.4em; padding: 0; }
  .end-page li { margin: 0.4em 0; }
  .end-page .ep-callout {
    margin: 1.2em 0; padding: 0.7em 1em;
    border-left: 3px solid #0083de; background: #e6f2fa;
    color: #1f2937; page-break-inside: avoid;
  }
  .end-page .ep-signoff { margin-top: 1.2em; }
  .end-page .ep-tagline {
    font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
    font-size: 9.5pt; color: #6b7280; letter-spacing: 0.02em;
  }`;

export const END_PAGE_HTML = `
  <section class="end-page">
    <div class="ep-header">
      <span class="ep-brand">JesusOnline Equip</span>
      <span class="ep-brand-tag">Ministry Resources Hub</span>
    </div>
    <h1 class="ep-title">Thank you for downloading this free resource!</h1>
    <span class="ep-rule"></span>
    <p class="ep-lead">We're grateful you've taken this step in your spiritual journey. Your growth in Christ encourages us, and we pray this has been a blessing—strengthening your faith, deepening your understanding of God's Word, and equipping you to live for His glory.</p>

    <h2>Share Your Thoughts</h2>
    <p>Your feedback helps us improve future resources and encourages others:</p>
    <p><strong>Leave a Review or Send Us a Note</strong> — If you found this helpful, please consider leaving a short review. Your honest words make a big difference! We love hearing how God is using these materials in your life.<br />
    Share Your Story → <a href="https://equip.jesusonline.com/reviews/share">equip.jesusonline.com/reviews/share</a></p>

    <h2>Discover More Free Resources</h2>
    <p>Continue growing in your walk with Jesus. Here are additional tools from the JO EQUIP library and JesusOnline Ministries:</p>
    <ul>
      <li><strong>Explore the Free Books</strong> → <a href="https://equip.jesusonline.com/books">equip.jesusonline.com/books</a></li>
      <li><strong>Download the Free JO App</strong> — Your personal discipleship hub with the NET Bible, daily devotions, interactive studies, prayer tools, more books, and videos. <a href="https://play.google.com/store/apps/details?id=com.clear.joapp">Download for Android</a> · <a href="https://apps.apple.com/us/app/jo-app/id1474405483">Download for iOS</a> · Explore in browser → <a href="https://app.jesusonline.com">app.jesusonline.com</a></li>
      <li><strong>Watch Video Playlists</strong> → <a href="https://equip.jesusonline.com/playlists">equip.jesusonline.com/playlists</a></li>
      <li><strong>Visit JesusOnline Ministries</strong> — For more about this ministry and global outreach: <a href="https://jesusonlineministries.org">jesusonlineministries.org</a></li>
    </ul>

    <div class="ep-callout">
      <strong>Would you like to help others?</strong> Share this resource (or the download link) with friends, your small group, or your church. Every copy planted can bear eternal fruit!
    </div>

    <p>Thank you again for partnering with us in the Great Commission. May the Lord continue to fill you with joy, peace, and purpose as you walk with Him.</p>
    <p class="ep-signoff">In Christ,<br />
    <strong>The JesusOnline Ministries Team</strong><br />
    <span class="ep-tagline">Apologetics • Evangelism • Discipleship • Equipping</span></p>
  </section>`;
