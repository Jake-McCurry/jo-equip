import mammoth from "mammoth";

/**
 * The final resources leaf is maintained as a Word document so that its copy
 * and artwork stay tied to the supplied source.  Mammoth's default image
 * converter emits data URLs, which keeps the generated PDF reproducible
 * without depending on a temporary extraction directory.
 */
export async function loadAdditionalResourcesHtml(docxPath: string): Promise<string> {
  const { value, messages } = await mammoth.convertToHtml({ path: docxPath });
  const warnings = messages.filter(
    message => message.type === "warning" && !/Unrecognised paragraph style/.test(message.message),
  );
  if (warnings.length) {
    console.warn("  resources mammoth warnings:", warnings.map(message => message.message).join("; "));
  }

  let html = value.replace(/^\s*<p>Additional Resources<\/p>/i, "");

  /*
   * These are the two current labels supplied with the page.  The source
   * document has the second heading in an ordinary Heading 2 paragraph; the
   * first descriptive paragraph is also marked Heading 2 in Word.  Keep its
   * wording exactly, while restoring its intended paragraph semantics.
   */
  html = html.replace(
    /<h2>The JO Discipleship App<\/h2>/i,
    "<h2>The JO APP Growth Resources for Believers</h2>",
  );
  html = html.replace(
    /<h2>(The JO App helps believers grow closer to Jesus[\s\S]*?)<\/h2>/i,
    "<p>$1</p>",
  );
  html = html.replace(
    /<h2>The JO EQUIP Resources for Discipleship<\/h2>/i,
    "<h2>The JO EQUIP Resources for Pastors and Disciplers</h2>",
  );

  if (
    !html.includes("The JO APP Growth Resources for Believers") ||
    !html.includes("The JO EQUIP Resources for Pastors and Disciplers") ||
    !/<img\b[^>]+src="data:image\//i.test(html)
  ) {
    throw new Error("Additional Resources source did not contain the expected headings and images");
  }
  return html;
}