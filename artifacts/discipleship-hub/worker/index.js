/**
 * Cloudflare Worker entry for jo-equip.
 *
 * Handles:
 *   POST /api/subscribe   → forwards book-download email captures to Virtuous
 *   Everything else       → served from static assets (the built Astro site)
 *
 * Env vars (set in Cloudflare → Workers & Pages → jo-equip → Settings → Variables and Secrets):
 *   VIRTUOUS_API_KEY  (secret, required)  Bearer token from Virtuous → Settings → API
 *
 * Bindings (declared in wrangler.jsonc):
 *   ASSETS  static-assets binding pointing at ./dist
 */

const VIRTUOUS_CONTACT_URL = "https://api.virtuoussoftware.com/api/Contact";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function isValidEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function handleSubscribe(request, env) {
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ ok: false, error: "Method not allowed" }),
      { status: 405, headers: { ...JSON_HEADERS, Allow: "POST" } },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const email = String(body?.email || "").trim().toLowerCase();
  const source = String(body?.source || "jo-equip").slice(0, 64);
  const bookId = String(body?.book_id || "").slice(0, 128);
  const bookTitle = String(body?.book_title || "").slice(0, 256);

  if (!isValidEmail(email)) {
    return jsonResponse({ ok: false, error: "Invalid email address" }, 400);
  }

  if (!env.VIRTUOUS_API_KEY) {
    console.error("[subscribe] VIRTUOUS_API_KEY is not set");
    return jsonResponse({ ok: true, warning: "not_configured" }, 200);
  }

  const payload = {
    contactType: "Household",
    name: email,
    referenceSource: source,
    referenceId: bookId || undefined,
    contactIndividuals: [
      {
        firstName: "Friend",
        lastName: "Subscriber",
        isPrimary: true,
        contactMethods: [
          {
            type: "Home Email",
            value: email,
            isOptedIn: true,
            isPrimary: true,
          },
        ],
      },
    ],
    customFields: bookTitle
      ? [{ name: "Book Downloaded", value: bookTitle }]
      : [],
  };

  try {
    const resp = await fetch(VIRTUOUS_CONTACT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.VIRTUOUS_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "(no body)");
      console.error(
        "[subscribe] Virtuous API error",
        resp.status,
        resp.statusText,
        errText.slice(0, 500),
      );
      return jsonResponse({ ok: true, warning: "upstream_error" }, 200);
    }

    return jsonResponse({ ok: true }, 200);
  } catch (err) {
    console.error("[subscribe] Fetch to Virtuous failed", String(err));
    return jsonResponse({ ok: true, warning: "upstream_unreachable" }, 200);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/subscribe") {
      return handleSubscribe(request, env);
    }

    // Everything else: serve from the static assets binding.
    return env.ASSETS.fetch(request);
  },
};
