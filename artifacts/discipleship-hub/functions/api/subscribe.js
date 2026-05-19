/**
 * Cloudflare Pages Function: POST /api/subscribe
 *
 * Receives email captures from the book-download gate on /books and
 * forwards them to Virtuous as a new contact.
 *
 * Env vars (set in Cloudflare Pages dashboard → Settings → Environment variables):
 *   VIRTUOUS_API_KEY   (required)  Bearer token from Virtuous → Settings → API
 *
 * Request body (JSON):
 *   { email, source, book_id, book_title }
 *
 * Behavior:
 *   - Always returns 200 to the client so the PDF download is never blocked,
 *     even if Virtuous is misconfigured or temporarily unreachable.
 *   - Logs all upstream errors to the Cloudflare Pages function log so we can
 *     debug iteratively. Inspect logs in CF dashboard → Pages → jo-equip →
 *     Functions → Real-time logs.
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

export async function onRequestPost({ request, env }) {
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
    console.error("[subscribe] VIRTUOUS_API_KEY is not set in Pages env vars");
    // Return 200 so user's download still works even if we're misconfigured.
    return jsonResponse({ ok: true, warning: "not_configured" }, 200);
  }

  // Virtuous Contact API payload.
  // A "Household" contact with a single primary individual whose email is
  // the captured value. We pass the source + book metadata as a reference
  // string + custom field so you can build automation rules in Virtuous
  // (e.g. "if originSegmentCode = jo-equip-books, add to Book Downloads list").
  const payload = {
    contactType: "Household",
    name: email, // placeholder household name; Virtuous requires one
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
      // Still 200 so download isn't blocked.
      return jsonResponse({ ok: true, warning: "upstream_error" }, 200);
    }

    return jsonResponse({ ok: true }, 200);
  } catch (err) {
    console.error("[subscribe] Fetch to Virtuous failed", String(err));
    return jsonResponse({ ok: true, warning: "upstream_unreachable" }, 200);
  }
}

// Reject all other methods cleanly.
export async function onRequest({ request }) {
  if (request.method === "POST") {
    // Will be handled by onRequestPost above; this branch is a safety net.
    return jsonResponse({ ok: false, error: "Unhandled POST" }, 500);
  }
  return new Response(
    JSON.stringify({ ok: false, error: "Method not allowed" }),
    {
      status: 405,
      headers: { ...JSON_HEADERS, Allow: "POST" },
    },
  );
}
