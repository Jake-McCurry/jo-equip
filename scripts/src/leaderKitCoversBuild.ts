import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import puppeteer from "puppeteer";

const root = path.resolve(import.meta.dirname, "../..");
const out = path.join(root, "artifacts/discipleship-hub/public/leader-kits/covers");
const books = path.join(root, "artifacts/discipleship-hub/public/books/covers");
const cards = [
  { id: "adventure-of-living-with-jesus", title: "The Adventure of Living with Jesus", prompt: "Churchgoers or disciples?", weeks: "Ten weeks" },
  { id: "a-heart-after-god", title: "A Heart After God", prompt: "Behavior modification or heart transformation?", weeks: "Nine weeks", useExtractedFlatCover: true },
  { id: "your-new-identity-in-christ", title: "Your New Identity in Christ", prompt: "Old habits or a new creation?", weeks: "Ten lessons" },
  { id: "beholding-the-majesty-of-god", title: "Beholding the Majesty of God", prompt: "Your own story or His eternal glory?", weeks: "Six lessons" },
  { id: "walking-in-the-spirit", title: "Walking in the Spirit", prompt: "Human effort or Spirit-led living?", weeks: "Fifteen lessons" },
  { id: "building-blocks-for-maturity", title: "Building Blocks for Maturity", prompt: "Practiced Steps of Growing Up in Christ", weeks: "Eleven lessons", textCover: true },
];

for (const font of ["Carlito", "Caladea"]) {
  const actual = execFileSync("fc-match", ["-f", "%{family}", font], { encoding: "utf8" });
  if (!actual.includes(font)) throw new Error(`Install ${font} before building Leader Kit covers (found ${actual}).`);
}

await fs.mkdir(out, { recursive: true });

const manuscript = path.join(root, "attached_assets/2_Heart_After_God_Leader_Kit_v.091226J_1789677319902.docx");
const rawHeart = execFileSync("unzip", ["-p", manuscript, "word/media/image1.png"], { maxBuffer: 10 * 1024 * 1024 });
await fs.writeFile("/tmp/heart_original.png", rawHeart);
execFileSync("convert", ["/tmp/heart_original.png", "-crop", "2550x2096+0+1054", "+repage", "/tmp/heart_artwork.png"]);
const heartFlatCoverBuffer = await fs.readFile("/tmp/heart_artwork.png");

const browser = await puppeteer.launch({
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
  args: ["--no-sandbox"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 1600, deviceScaleFactor: 2 });
  
  for (const card of cards) {
    let cover = "";
    if (card.useExtractedFlatCover) {
      // heartFlatCoverBuffer is already just the artwork now
      const b64 = heartFlatCoverBuffer.toString("base64");
      cover = `data:image/png;base64,${b64}`;
    } else if (card.id === "adventure-of-living-with-jesus") {
      // The approved mockup omits the lower photo strip, icons, and publisher
      // band. Stop above the strip's highest (right-hand) edge.
      const artwork = execFileSync("magick", [
        path.join(books, `${card.id}.jpg`),
        "-crop", "1051x1030+0+0", "+repage", "png:-",
      ], { maxBuffer: 10 * 1024 * 1024 });
      cover = `data:image/png;base64,${artwork.toString("base64")}`;
    } else if (!card.textCover) {
      cover = `data:image/jpeg;base64,${(await fs.readFile(path.join(books, `${card.id}.jpg`))).toString("base64")}`;
    }

    const htmlContent = `
      <div class="book-front">
        <header>
          <small>JO EQUIP &middot; JESUSONLINE MINISTRIES</small>
          <h1>THIS SUNDAY<br>LEADER KIT</h1>
          <p>${card.prompt}</p>
        </header>
        <div class="sub">
          <div class="lead">Lead Week 1 Discipleship Moment this Sunday.</div>
          <div class="weeks">${card.weeks}. One path toward a changed heart.</div>
        </div>
        ${cover ? `<div class="art-wrapper"><img alt="${card.title}" src="${cover}"></div>` : `
        <div class="text-cover">
          <span class="rule"></span>
          <h2>${card.title}</h2>
          <p>${card.prompt}</p>
          <span class="rule"></span>
          <p style="margin-top:20px;font-family:Carlito,sans-serif;font-size:20px;letter-spacing:1px;font-weight:bold;">JO EQUIP</p>
        </div>`}
        <footer>
          <a href="https://equip.jesusonline.com/leader-kits">equip.jesusonline.com/leader-kits</a>
          <div>Free to print and share</div>
        </footer>
      </div>`;

    await page.setContent(`<!doctype html><html><head><style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: transparent;
        font-family: Carlito, Arial, sans-serif;
        display: inline-block;
      }
      .scene {
        padding: 60px 80px 100px 60px;
        display: inline-block;
      }
      .book-wrapper {
        position: relative;
        width: 500px;
        box-shadow: 20px 25px 35px rgba(0,0,0,0.35),
                    8px 10px 20px rgba(0,0,0,0.15),
                    -2px 5px 15px rgba(0,0,0,0.08);
        border-radius: 2px 5px 5px 2px;
        background: #fff;
      }
      .book-wrapper::after {
        content: '';
        position: absolute;
        top: 0.5%;
        bottom: 0.5%;
        right: -12px;
        width: 12px;
        background: linear-gradient(to right, #e8e8e8, #fcfcfc 30%, #e0e0e0 80%, #bcbcbc);
        border-right: 1px solid #999;
        border-top-right-radius: 4px;
        border-bottom-right-radius: 4px;
        z-index: 1;
        box-shadow: inset 3px 0 5px rgba(0,0,0,0.06);
      }
      .book-front {
        width: 100%;
        overflow: hidden;
        border-radius: 2px;
        position: relative;
        z-index: 2;
        display: flex;
        flex-direction: column;
        background: #fff;
      }
      header {
        flex-shrink: 0;
        background: #1b365d;
        color: white;
        text-align: center;
        padding: 26px 20px 22px;
        border-bottom: 3px solid #c4a35a;
      }
      small {
        display: block;
        color: #e8d7a8;
        letter-spacing: 1.5px;
        font-size: 11px;
        font-weight: 700;
        margin-bottom: 10px;
        text-transform: uppercase;
      }
      h1 {
        font-size: 30px;
        letter-spacing: 1.2px;
        margin: 0 0 10px;
        line-height: 1.1;
        font-weight: bold;
      }
      header p {
        font-family: Caladea, Georgia, serif;
        font-style: italic;
        font-size: 24px;
        margin: 0;
        opacity: 0.95;
      }
      .sub {
        flex-shrink: 0;
        background: #f6f1e4;
        color: #1b365d;
        text-align: center;
        padding: 18px 24px;
      }
      .sub .lead {
        font-weight: bold;
        font-size: 18px;
        margin-bottom: 3px;
      }
      .sub .weeks {
        font-size: 16px;
        opacity: 0.85;
      }
      .art-wrapper {
        position: relative;
        overflow: hidden;
        font-size: 0;
      }
      .art-wrapper img {
        display: block;
        width: 100%;
        height: auto;
      }
      .text-cover {
        height: 650px;
        background: #1b365d;
        color: #e8d7a8;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px;
        text-align: center;
        border-top: 1px solid #c4a35a;
      }
      .text-cover h2 {
        font: 44px/1.15 Caladea, Georgia, serif;
        color: #fff;
        margin: 24px 0;
      }
      .text-cover p {
        font-size: 22px;
        line-height: 1.4;
      }
      .rule {
        width: 100px;
        border-top: 3px solid #c4a35a;
      }
      footer {
        flex-shrink: 0;
        background: #1b365d;
        color: #7b8ca5;
        text-align: center;
        padding: 14px 20px;
        font-size: 12px;
        letter-spacing: 0.5px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        position: relative;
        z-index: 10;
      }
      footer a {
        color: #92a4c1;
        text-decoration: none;
        margin-bottom: 2px;
      }
    </style></head><body>
      <div class="scene">
        <div class="book-wrapper">
          ${htmlContent}
        </div>
      </div>
    </body></html>`);
    
    await page.evaluate("document.fonts.ready.then(() => Promise.all([...document.images].map(image => image.decode())))");
    
    const element = await page.$(".scene");
    await element!.screenshot({ path: path.join(out, `${card.id}.png`), omitBackground: true });
    
    console.log(`Leader Kit cover: ${card.id}`);
  }
} finally {
  await browser.close();
}
