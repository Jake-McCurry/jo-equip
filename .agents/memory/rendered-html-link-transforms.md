---
name: Rendered HTML link transforms
description: Browser-semantics requirements for safely classifying and rewriting links in generated HTML.
---

Final-HTML link policies must classify the value a browser sees, not the raw
attribute spelling: fully decode HTML attribute references, use WHATWG URL
parsing without JavaScript Unicode trimming, and split `rel` on HTML ASCII
whitespace. Any rewritten attribute value must be escaped before serialization.

**Why:** Partial entity decoding allowed external links and semantic duplicate
tokens to evade an audit. Decoding without safe re-escaping could turn inert
text into a new event-handler attribute. JavaScript `.trim()` also removes
Unicode characters that browsers retain in relative URLs.

**How to apply:** Use these rules whenever a build step or content migration
inspects or rewrites rendered anchor attributes. Test named/numeric entities,
Unicode versus ASCII whitespace, quote payloads, exact hostnames, and
idempotence.