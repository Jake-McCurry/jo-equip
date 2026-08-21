import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyHref,
  collectAnchors,
  transformExternalAnchorNofollow,
} from "./external-link-policy.mjs";

const transform = html => transformExternalAnchorNofollow(html).html;

test("classifies approved first-party, relative, and fragment links as internal", () => {
  for (const href of [
    "/about",
    "../about",
    "./about",
    "/about?from=test#team",
    "#main",
    "https://equip.jesusonline.com/about",
    "HTTP://EQUIP.JESUSONLINE.COM./about",
    "https://app.jesusonline.com/post/1",
    "https://jesusonline.com/",
    "https://jesusonlineministries.org/privacy-policy/",
  ]) {
    assert.equal(classifyHref(href).kind, "internal", href);
  }
});

test("uses exact hostnames and rejects lookalike or unapproved subdomains", () => {
  for (const href of [
    "https://equip.jesusonline.com.external.example/page",
    "https://external-equip.jesusonline.com/page",
    "https://evil-jesusonline.com/page",
    "https://blog.jesusonline.com/page",
  ]) {
    assert.equal(classifyHref(href).kind, "external", href);
  }
});

test("classifies protocol-relative URLs and leaves non-HTTP schemes special", () => {
  assert.equal(classifyHref("//external.example/page").kind, "external");
  assert.equal(classifyHref("//equip.jesusonline.com/about").kind, "internal");
  for (const href of ["mailto:user@example.com", "tel:+15551234567", "javascript:void(0)", "sms:+15551234567"]) {
    assert.equal(classifyHref(href).kind, "special", href);
  }
});

test("adds nofollow to an external anchor without changing its href", () => {
  const input = '<a href="https://external.example/path?q=1#part">External</a>';
  const output = transform(input);
  assert.equal(output, '<a href="https://external.example/path?q=1#part" rel="nofollow">External</a>');
  assert.equal(collectAnchors(output)[0].href, "https://external.example/path?q=1#part");
});

test("preserves existing rel tokens and appends nofollow once", () => {
  assert.equal(
    transform('<a href="https://external.example" rel="noopener noreferrer">External</a>'),
    '<a href="https://external.example" rel="noopener noreferrer nofollow">External</a>',
  );
  assert.equal(
    transform('<a href="https://external.example" rel="sponsored ugc">External</a>'),
    '<a href="https://external.example" rel="sponsored ugc nofollow">External</a>',
  );
});

test("does not duplicate nofollow and removes pre-existing external duplicates", () => {
  assert.equal(
    transform('<a href="https://external.example" rel="noopener nofollow">External</a>'),
    '<a href="https://external.example" rel="noopener nofollow">External</a>',
  );
  assert.equal(
    transform('<a href="https://external.example" rel="nofollow noopener NOFOLLOW">External</a>'),
    '<a href="https://external.example" rel="nofollow noopener">External</a>',
  );
});

test("keeps internal and special-scheme anchors byte-for-byte unchanged", () => {
  const input = [
    '<a href="/about">About</a>',
    '<a href="https://equip.jesusonline.com/about">About absolute</a>',
    '<a href="mailto:user@example.com">Email</a>',
    '<a href="tel:+15551234567">Call</a>',
    '<a href="javascript:void(0)">Action</a>',
  ].join("");
  assert.equal(transform(input), input);
});

test("handles protocol-relative, single-quoted, and unquoted external hrefs", () => {
  assert.equal(
    transform("<a href='//external.example/page' rel='ugc'>External</a>"),
    "<a href='//external.example/page' rel=\"ugc nofollow\">External</a>",
  );
  assert.equal(
    transform("<a href=https://external.example>External</a>"),
    '<a href=https://external.example rel="nofollow">External</a>',
  );
});

test("does not modify non-anchor URLs or anchor-looking strings in scripts", () => {
  const input = [
    '<link href="https://external.example/style.css">',
    '<iframe src="https://external.example/embed"></iframe>',
    '<form action="https://external.example/submit"></form>',
    '<script>const sample = \'<a href="https://external.example">not DOM</a>\';</script>',
    '<iframe><a href="https://external.example">iframe raw text</a></iframe>',
    '<noembed><a href="https://external.example">noembed raw text</a></noembed>',
    '<plaintext><a href="https://external.example">plaintext raw text</a>',
  ].join("");
  assert.equal(transform(input), input);
});

test("handles raw-text closing-tag lookalikes and alternate comment endings", () => {
  const input = [
    '<script>const x = "</scripture><a href=\\"https://external.example\\">text</a>";</script>',
    '<!-- <a href="https://external.example">comment</a> --!>',
    '<a href="https://external.example">real anchor</a>',
  ].join("");
  assert.equal(
    transform(input),
    input.replace(
      '<a href="https://external.example">real anchor</a>',
      '<a href="https://external.example" rel="nofollow">real anchor</a>',
    ),
  );
});

test("uses HTML ASCII whitespace for attributes and rel tokens", () => {
  const nonBreakingSpace = "\u00a0";
  const notAnHref = `<a data${nonBreakingSpace}href="https://external.example">Not a link</a>`;
  assert.equal(transform(notAnHref), notAnHref);

  const output = transform(
    `<a href="https://external.example" rel="ugc${nonBreakingSpace}noopener">External</a>`,
  );
  const anchor = collectAnchors(output)[0];
  assert.deepEqual(anchor.relTokens, [`ugc${nonBreakingSpace}noopener`, "nofollow"]);
});

test("lets the WHATWG URL parser distinguish ASCII from Unicode whitespace", () => {
  for (const href of [
    " \t\nhttps://external.example/path\r ",
    " \n//external.example/path\t",
  ]) {
    assert.equal(classifyHref(href).kind, "external", href);
  }

  for (const href of [
    "\u00a0https://external.example/path",
    "&#160;https://external.example/path",
    "\u1680https://external.example/path",
    "\u2000https://external.example/path",
    "\ufeffhttps://external.example/path",
  ]) {
    assert.equal(classifyHref(href).kind, "internal", href);
    const input = `<a href="${href}">Unicode-space relative link</a>`;
    assert.equal(transform(input), input);
  }
});

test("inserts rel before a self-closing marker", () => {
  const output = transform('<a href="https://external.example"/>');
  assert.equal(output, '<a href="https://external.example" rel="nofollow"/>');
  assert.equal(collectAnchors(output)[0].nofollowCount, 1);
  assert.equal(transform(output), output);
});

test("decodes URL character references before classification", () => {
  assert.equal(classifyHref("https&#58;&#47;&#47;external.example/page").kind, "external");
  assert.equal(classifyHref("https&colon;&sol;&sol;external&period;example/page").kind, "external");
  assert.equal(classifyHref("https&NewLine;://external.example/page").kind, "external");
  assert.equal(classifyHref("https&Tab;://external.example/page").kind, "external");
  assert.equal(
    transform('<a href="https&#58;&#47;&#47;external.example/page">External</a>'),
    '<a href="https&#58;&#47;&#47;external.example/page" rel="nofollow">External</a>',
  );
});

test("decodes rel character references and emits exactly one semantic nofollow token", () => {
  const output = transform(
    '<a href="https://external.example" rel="no&#102;ollow noopener NO&#x46;OLLOW">External</a>',
  );
  assert.equal(
    output,
    '<a href="https://external.example" rel="nofollow noopener">External</a>',
  );
  assert.equal(collectAnchors(output)[0].nofollowCount, 1);
});

test("safely re-encodes decoded rel quotes without creating new attributes", () => {
  for (const input of [
    '<a href="https://external.example" rel="ugc&quot; onclick=&quot;alert(1)">External</a>',
    "<a href=\"https://external.example\" rel='ugc&apos; onclick=&apos;alert(1)'>External</a>",
    '<a href="https://external.example" rel="ugc&#34; onmouseover=&#34;alert(1)">External</a>',
  ]) {
    const output = transform(input);
    const anchor = collectAnchors(output)[0];
    assert.equal(anchor.href, "https://external.example");
    assert.equal(anchor.nofollowCount, 1);
    assert.deepEqual(anchor.attributes.map(attribute => attribute.lowerName), ["href", "rel"]);
    assert.equal(transform(output), output);
  }
});

test("transform is idempotent", () => {
  const first = transform('<a href="https://external.example" rel="noopener">External</a>');
  assert.equal(transform(first), first);
});