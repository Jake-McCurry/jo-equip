import fs from "node:fs/promises";
import path from "node:path";
import mammoth from "mammoth";

type Block =
  | { type: "p"; html: string }
  | { type: "h2" | "h3"; text: string }
  | { type: "ul" | "ol"; items: string[] }
  | { type: "figure"; src: string; alt: string };

interface Article {
  id: string;
  appSlug?: string;
  subId: "attributes-of-god";
  channelId: "growth";
  title: string;
  description: string;
  pdf: string;
  localSource: true;
  parentArticleId?: string;
  blocks: Block[];
}

interface Node {
  tag: "p" | "h1" | "h2" | "h3" | "h4" | "ul" | "ol";
  inner: string;
  text: string;
}

const workspace = path.resolve(import.meta.dirname, "../..");
const source = path.join(
  workspace,
  "attached_assets/Attributes_of_God_updated_articles_260905_1789064531315.docx",
);
const jsonOutput = path.join(
  workspace,
  "artifacts/discipleship-hub/src/data/local/articles/attributes-of-god.json",
);
const htmlOutput = path.join(workspace, "scripts/data/local-articles/attributes-of-god");
const imageOutput = path.join(
  workspace,
  "artifacts/discipleship-hub/public/images/articles/attributes-of-god",
);
const imagePublicPath = "/images/articles/attributes-of-god/attributes-of-god-wheel.png";
const imageAlt =
  "Circular diagram grouping God’s attributes as self-existent, sovereign, holy, and love";
const articleBase = "/categories/growth/attributes-of-god";

const mainArticles = [
  ["the-supreme-pursuit-of-the-heart", "The Supreme Pursuit of the Heart", "32211"],
  ["a-balanced-vision-of-god", "A Balanced Vision of God", undefined],
  ["attributes-of-self-existence", "Attributes of Self-Existence", "32212"],
  ["attributes-of-sovereignty", "Attributes of Sovereignty", "32213"],
  ["attributes-of-holiness", "Attributes of Holiness", "32214"],
  ["attributes-of-love", "Attributes of Love", "32215"],
  ["live-in-the-light-of-his-majesty", "Live in the Light of His Majesty", "32216"],
] as const;

const leafGroups = [
  {
    parent: "attributes-of-self-existence",
    articles: [
      ["god-is-self-existent", "God Is Self-Existent"],
      ["god-is-eternal", "God Is Eternal"],
      ["god-is-transcendent", "God Is Transcendent"],
      ["god-is-spirit", "God Is Spirit"],
      ["god-is-unchanging", "God Is Unchanging (Immutable)"],
    ],
  },
  {
    parent: "attributes-of-sovereignty",
    articles: [
      ["god-is-sovereign", "God Is Sovereign"],
      ["god-is-all-powerful", "God Is All-Powerful (Omnipotent)"],
      ["god-is-all-knowing", "God Is All-Knowing (Omniscient)"],
      ["god-is-present-everywhere", "God Is Present Everywhere (Omnipresent)"],
      ["god-is-free", "God Is Free"],
    ],
  },
  {
    parent: "attributes-of-holiness",
    articles: [
      ["god-is-holy", "God Is Holy"],
      ["god-is-righteous", "God Is Righteous"],
      ["god-is-just", "God Is Just"],
      ["god-is-faithful", "God Is Faithful"],
      ["god-is-absolute-truth", "God Is Absolute Truth"],
    ],
  },
  {
    parent: "attributes-of-love",
    articles: [
      ["god-is-love", "God Is Love"],
      ["god-is-merciful", "God Is Merciful"],
      ["god-is-gracious", "God Is Gracious"],
      ["god-is-good", "God Is Good"],
      ["god-is-wise", "God Is Wise"],
    ],
  },
] as const;

const leaves = leafGroups.flatMap(group =>
  group.articles.map(([id, title]) => ({ id, title, parent: group.parent })),
);

function decodeText(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalTitle(value: string): string {
  return value
    .replace(/^\d+\.\s*/, "")
    .replace(/\s*\((?:Immutable|Omnipotent|Omniscient|Omnipresent)\)\s*$/, "")
    .trim();
}

function parseTopLevel(html: string): Node[] {
  const nodes: Node[] = [];
  const expression = /<(p|h1|h2|h3|h4|ul|ol)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = expression.exec(html))) {
    nodes.push({
      tag: match[1].toLowerCase() as Node["tag"],
      inner: match[2].trim(),
      text: decodeText(match[2]),
    });
  }
  return nodes;
}

function trimHtml(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/<br\s*\/?>/gi, "<br>")
    .replace(/>\s+</g, "><")
    .trim();
}

function toBlocks(nodes: Node[], leaf: boolean): Block[] {
  const blocks: Block[] = [];
  for (const node of nodes) {
    if (!node.text && !node.inner.includes("<img")) continue;
    if (node.inner.includes('src="ATTRIBUTE_WHEEL"')) {
      blocks.push({ type: "figure", src: imagePublicPath, alt: imageAlt });
      continue;
    }
    if (leaf && node.text === "Daily Impact") {
      blocks.push({ type: "h2", text: "Daily Impact" });
      continue;
    }
    if (leaf && node.text.startsWith("Reflection ") && /<br\s*\/?>/i.test(node.inner)) {
      const reflection = node.inner.replace(/^.*?<br\s*\/?>/i, "").trim();
      blocks.push({ type: "h3", text: "Reflection" });
      if (reflection) blocks.push({ type: "p", html: trimHtml(reflection) });
      continue;
    }
    if (node.tag === "p") {
      blocks.push({ type: "p", html: trimHtml(node.inner) });
      continue;
    }
    if (node.tag === "ul" || node.tag === "ol") {
      const items = [...node.inner.matchAll(/<li(?:\s[^>]*)?>([\s\S]*?)<\/li>/gi)].map(item =>
        trimHtml(item[1]),
      );
      blocks.push({ type: node.tag, items });
      continue;
    }

    if (leaf) {
      if (node.text === "Questions for Personal Application" || node.text === "Reflection")
        blocks.push({ type: "h3", text: node.text });
      else if (node.text === "Daily Impact" || node.text.startsWith("Word Pictures of "))
        blocks.push({ type: "h2", text: node.text });
      else if (node.tag === "h4")
        blocks.push({ type: "p", html: `<strong>${trimHtml(node.inner)}</strong>` });
      else blocks.push({ type: "p", html: trimHtml(node.inner) });
      continue;
    }
    const type: "h2" | "h3" = node.tag === "h3" ? "h3" : "h2";
    blocks.push({ type, text: node.text });
  }
  return blocks;
}

function descriptionFor(blocks: Block[]): string {
  const paragraph = blocks.find(
    block => block.type === "p" && decodeText(block.html).length > 35,
  ) as Extract<Block, { type: "p" }> | undefined;
  const text = paragraph ? decodeText(paragraph.html) : "";
  return text.length <= 180 ? text : `${text.slice(0, 177).trimEnd()}…`;
}

function blocksToHtml(blocks: Block[]): string {
  return `${blocks
    .map(block => {
      switch (block.type) {
        case "p":
          return `<p>${block.html}</p>`;
        case "h2":
        case "h3":
          return `<${block.type}>${block.text}</${block.type}>`;
        case "ul":
        case "ol":
          return `<${block.type}>${block.items.map(item => `<li>${item}</li>`).join("")}</${block.type}>`;
        case "figure":
          return `<figure><img src="${block.src}" alt="${block.alt}"></figure>`;
      }
    })
    .join("\n")}\n`;
}

async function main(): Promise<void> {
  const convertedImages: Buffer[] = [];
  const result = await mammoth.convertToHtml(
    { path: source },
    {
      convertImage: mammoth.images.imgElement(async image => {
        const buffer = Buffer.from(await image.read("base64"), "base64");
        convertedImages.push(buffer);
        return { src: convertedImages.length === 1 ? "ADMIN_COVER" : "ATTRIBUTE_WHEEL" };
      }),
    },
  );
  if (result.messages.some(message => message.type === "error")) {
    throw new Error(result.messages.map(message => message.message).join("\n"));
  }
  if (convertedImages.length !== 2) {
    throw new Error(`Expected 2 manuscript images, found ${convertedImages.length}`);
  }

  const nodes = parseTopLevel(result.value);
  const starts: Array<
    | { index: number; kind: "main"; id: string; title: string; appSlug?: string }
    | { index: number; kind: "leaf"; id: string; title: string; parent: string }
  > = [];

  for (const [id, title, appNumber] of mainArticles) {
    const index = nodes.findIndex(
      node => node.tag === "p" && canonicalTitle(node.text) === title && /^\d+\./.test(node.text),
    );
    if (index < 0) throw new Error(`Main article marker not found: ${title}`);
    starts.push({
      index,
      kind: "main",
      id,
      title,
      appSlug: appNumber ? `${appNumber}-${id}` : undefined,
    });
  }

  let searchFrom = 0;
  for (const group of leafGroups) {
    const adminIndex = nodes.findIndex(
      (node, candidate) =>
        candidate >= searchFrom && node.text.includes("[Use the following for each"),
    );
    if (adminIndex < 0) throw new Error(`Leaf administration marker not found for ${group.parent}`);
    searchFrom = adminIndex + 1;
    for (const [id, title] of group.articles) {
      const index = nodes.findIndex(
        (node, candidate) =>
          candidate >= searchFrom &&
          (node.tag === "h1" || node.tag === "h2" || node.tag === "p") &&
          (canonicalTitle(node.text) === canonicalTitle(title) ||
            (node.tag === "p" &&
              node.text.startsWith(`${canonicalTitle(title)} `) &&
              /<br\s*\/?>/i.test(node.inner))),
      );
      if (index < 0) throw new Error(`Leaf article marker not found: ${title}`);
      starts.push({ index, kind: "leaf", id, title, parent: group.parent });
      searchFrom = index + 1;
    }
  }
  starts.sort((a, b) => a.index - b.index);

  const articles: Article[] = [];
  for (let position = 0; position < starts.length; position += 1) {
    const start = starts[position];
    const next = starts[position + 1]?.index ?? nodes.length;
    let body = nodes.slice(start.index + 1, next);
    if (
      start.kind === "leaf" &&
      nodes[start.index].tag === "p" &&
      nodes[start.index].text.startsWith(`${canonicalTitle(start.title)} `)
    ) {
      const remainder = nodes[start.index].inner.replace(/^.*?<br\s*\/?>/i, "").trim();
      body.unshift({ tag: "p", inner: remainder, text: decodeText(remainder) });
    }

    if (start.kind === "main") {
      const admin = body.findIndex(node => node.text.includes("[Use the following for each"));
      if (admin >= 0) body = body.slice(0, admin);

      const group = leafGroups.find(candidate => candidate.parent === start.id);
      if (group) {
        const goDeeper = body.findIndex(node => node.text === "Go Deeper:");
        if (goDeeper < 0) throw new Error(`Go Deeper marker not found in ${start.id}`);
        body = [
          ...body.slice(0, goDeeper),
          { tag: "h2", inner: "Go Deeper:", text: "Go Deeper:" },
          {
            tag: "ul",
            text: group.articles.map(([, title]) => `>> ${canonicalTitle(title)}`).join(" "),
            inner: group.articles
              .map(
                ([id, title]) =>
                  `<li>&gt;&gt; <a href="${articleBase}/${id}">${canonicalTitle(title)}</a></li>`,
              )
              .join(""),
          },
        ];
      }
    }

    let blocks = toBlocks(body, start.kind === "leaf");
    if (start.id === "the-supreme-pursuit-of-the-heart") {
      const opening = blocks.findIndex(block => block.type === "p");
      if (opening < 0) throw new Error("Opening quotation paragraph not found");
      blocks[opening] = {
        type: "p",
        html:
          "<em>“Let not the wise man boast in his wisdom…<br>But let the one who boasts boast in this: that he understands and knows me.”</em><br><strong>— Jeremiah 9:24</strong>",
      };
    }

    const appSlug = start.kind === "main" ? start.appSlug : undefined;
    const pdf = appSlug
      ? `/articles/${appSlug}.pdf`
      : `/articles/attributes-of-god/${start.id}.pdf`;
    articles.push({
      id: start.id,
      ...(appSlug ? { appSlug } : {}),
      subId: "attributes-of-god",
      channelId: "growth",
      title: start.title,
      description: descriptionFor(blocks),
      pdf,
      localSource: true,
      ...(start.kind === "leaf" ? { parentArticleId: start.parent } : {}),
      blocks,
    });
  }

  if (articles.length !== 27 || articles.filter(article => article.parentArticleId).length !== 20) {
    throw new Error(`Expected 7 main and 20 leaf articles, produced ${articles.length}`);
  }

  const articleById = new Map(articles.map(article => [article.id, article]));
  const orderedArticles = [
    ...mainArticles.map(([id]) => articleById.get(id)),
    ...leaves.map(({ id }) => articleById.get(id)),
  ];
  if (orderedArticles.some(article => !article)) {
    throw new Error("Could not restore the requested main/leaf article ordering");
  }
  const finalArticles = orderedArticles as Article[];

  for (const article of finalArticles.filter(article => article.parentArticleId)) {
    const headings = article.blocks
      .filter(
        (block): block is Extract<Block, { type: "h2" | "h3" }> =>
          block.type === "h2" || block.type === "h3",
      )
      .map(block => `${block.type}:${block.text}`);
    const expected = [
      "h2:Daily Impact",
      "h3:Questions for Personal Application",
      "h2:Word Pictures of ",
      "h3:Reflection",
    ];
    for (const heading of expected) {
      if (!headings.some(value => (heading.endsWith("of ") ? value.startsWith(heading) : value === heading))) {
        throw new Error(`${article.id} is missing required heading ${heading}`);
      }
    }
  }

  await fs.mkdir(path.dirname(jsonOutput), { recursive: true });
  await fs.mkdir(htmlOutput, { recursive: true });
  await fs.mkdir(imageOutput, { recursive: true });
  await fs.writeFile(jsonOutput, `${JSON.stringify(finalArticles, null, 2)}\n`);
  await fs.writeFile(path.join(imageOutput, "attributes-of-god-wheel.png"), convertedImages[1]);
  await Promise.all(
    finalArticles.map(article =>
      fs.writeFile(path.join(htmlOutput, `${article.id}.html`), blocksToHtml(article.blocks)),
    ),
  );
  console.log(`Imported ${finalArticles.length} articles (${leaves.length} Go Deeper articles).`);
}

await main();