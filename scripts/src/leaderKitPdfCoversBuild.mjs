import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import puppeteer from "puppeteer";

const root = path.resolve(import.meta.dirname, "../..");
const kits = path.join(root, "artifacts/discipleship-hub/public/leader-kits");
const ids = [
  "your-new-identity-in-christ",
  "beholding-the-majesty-of-god",
  "walking-in-the-spirit",
];
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "leader-kit-covers-"));
let browser;
try {
  browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH ||
      execFileSync("which", ["chromium"], { encoding: "utf8" }).trim(),
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 1600, deviceScaleFactor: 2 });
  for (const id of ids) {
    const flat = path.join(temporary, `${id}.png`);
    execFileSync("python", ["-c", [
      "import fitz, sys",
      "with fitz.open(sys.argv[1]) as doc:",
      "    doc[0].get_pixmap(matrix=fitz.Matrix(2, 2)).save(sys.argv[2])",
    ].join("\n"), path.join(kits, `${id}-leader-kit.pdf`), flat]);
    const cover = (await fs.readFile(flat)).toString("base64");
    // Keep the original thumbnails' canvas and apparent width, but render
    // a true perspective cover and page block instead of a flat page stripe.
    await page.setContent(`<!doctype html><html><head><style>
      * { box-sizing: border-box; }
      body { margin: 0; background: transparent; display: inline-block; }
      .scene {
        padding: 60px 80px 100px 60px; display: inline-block;
        position: relative;
      }
      .scene::before {
        content: ''; position: absolute; left: 72px; right: 46px;
        bottom: 74px; height: 30px; border-radius: 50%;
        background: rgba(18,29,40,.26); filter: blur(17px);
      }
      .book-wrapper {
        position: relative; width: 500px;
        transform-style: preserve-3d;
        transform: perspective(1800px) rotateY(-24deg) rotateX(3deg) scale(1.045);
      }
      .book-wrapper::after {
        content: ''; position: absolute; top: 3px; bottom: 3px;
        left: 100%; width: 48px;
        transform-origin: left center; transform: rotateY(90deg);
        background:
          linear-gradient(to right,rgba(0,0,0,.18),transparent 18%,rgba(0,0,0,.1)),
          repeating-linear-gradient(to right,#f9f6ee 0px,#f9f6ee 2px,#d8d4cb 2px,#ede9df 3px);
        border: 2px solid #b3b0a7; border-right: 5px solid #173453;
        box-shadow: inset 0 0 9px rgba(0,0,0,.15);
      }
      .book-front {
        overflow: hidden; border-radius: 2px; position: relative;
        box-shadow: 2px 3px 5px rgba(0,0,0,.25);
      }
      .book-front::after {
        content: ''; position: absolute; inset: 0; pointer-events: none;
        background: linear-gradient(to right,
          rgba(0,0,0,.32),rgba(255,255,255,.14) 1.2%,
          rgba(0,0,0,.1) 2.2%,transparent 4.5%,transparent 96%,
          rgba(255,255,255,.13) 99%,rgba(0,0,0,.2));
        border: 1px solid rgba(0,0,0,.14);
      }
      img { display: block; width: 100%; height: auto; }
    </style></head><body><div class="scene"><div class="book-wrapper">
      <div class="book-front"><img src="data:image/png;base64,${cover}" alt=""></div>
    </div></div></body></html>`);
    await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
    await (await page.$(".scene")).screenshot({
      path: path.join(kits, "covers", `${id}.png`),
      omitBackground: true,
    });
    console.log(`Updated ${id}`);
  }
} finally {
  await browser?.close();
  await fs.rm(temporary, { recursive: true, force: true });
}