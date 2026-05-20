/**
 * Cloudflare Worker entry for jo-equip.
 *
 * Handles:
 *   POST /api/subscribe   → forwards book-download email captures to Virtuous
 *   Everything else       → served from static assets (the built Astro site)
 *
 * Env vars (set in Cloudflare → Workers & Pages → jo-equip → Settings → Variables and Secrets):
 *   VIRTUOUS_API_KEY       (secret, required)  Bearer token from Virtuous → Settings → API
 *   TURNSTILE_SECRET_KEY   (secret, recommended) Cloudflare Turnstile secret key.
 *                          If unset, Turnstile verification is skipped (a warning is logged).
 *                          Get one: https://dash.cloudflare.com → Turnstile → your widget → "Secret key"
 *
 * Bindings (declared in wrangler.jsonc):
 *   ASSETS  static-assets binding pointing at ./dist
 *
 * Scaling notes:
 *   - The handler returns 200 to the client BEFORE the Virtuous call completes.
 *     The upstream POST runs inside ctx.waitUntil() so the client never waits on
 *     a third-party CRM (and Worker CPU time stays under ~1ms per request).
 *   - Emails are hashed (sha256, first 12 hex chars) before being logged — never
 *     log raw PII. The hash is stable so duplicate submissions are still traceable.
 *   - Turnstile keeps automated bots from polluting Virtuous and burning quota.
 */

const VIRTUOUS_CONTACT_URL = "https://api.virtuoussoftware.com/api/Contact";
const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

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

/** Stable, short, non-reversible identifier for log correlation. */
async function hashEmail(email) {
  try {
    const data = new TextEncoder().encode(email);
    const buf = await crypto.subtle.digest("SHA-256", data);
    const hex = Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
    return hex.slice(0, 12);
  } catch {
    return "hash_failed";
  }
}

/** Verify Cloudflare Turnstile token. Returns true if valid (or if no secret configured). */
async function verifyTurnstile(token, env, clientIp) {
  if (!env.TURNSTILE_SECRET_KEY) {
    console.warn("[subscribe] TURNSTILE_SECRET_KEY not set — skipping verification");
    return true;
  }
  if (!token || typeof token !== "string") {
    return false;
  }
  try {
    const form = new FormData();
    form.append("secret", env.TURNSTILE_SECRET_KEY);
    form.append("response", token);
    if (clientIp) form.append("remoteip", clientIp);

    const resp = await fetch(TURNSTILE_VERIFY_URL, { method: "POST", body: form });
    if (!resp.ok) {
      console.error("[subscribe] Turnstile verify HTTP error", resp.status);
      return false;
    }
    const data = await resp.json().catch(() => ({}));
    if (!data.success) {
      console.warn(
        "[subscribe] Turnstile rejected:",
        JSON.stringify(data["error-codes"] || []),
      );
    }
    return !!data.success;
  } catch (e) {
    console.error("[subscribe] Turnstile verify threw:", String(e));
    return false;
  }
}

/** Fire-and-forget Virtuous POST. Runs inside ctx.waitUntil(). */
async function sendToVirtuous(env, payload, emailHash) {
  if (!env.VIRTUOUS_API_KEY) {
    console.warn(`[subscribe:${emailHash}] VIRTUOUS_API_KEY not set — skipping upstream`);
    return;
  }
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
      const body = await resp.text().catch(() => "(no body)");
      console.error(
        `[subscribe:${emailHash}] Virtuous error ${resp.status}: ${body.slice(0, 500)}`,
      );
      return;
    }
    console.log(`[subscribe:${emailHash}] Virtuous ok (${resp.status})`);
  } catch (err) {
    console.error(`[subscribe:${emailHash}] Virtuous fetch failed:`, String(err));
  }
}

async function handleSubscribe(request, env, ctx) {
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
  // book_title is accepted by the client contract but not forwarded — title
  // can be resolved from book_id on the receiving side via books.ts.
  const turnstileToken = String(body?.turnstile_token || "");

  if (!isValidEmail(email)) {
    return jsonResponse({ ok: false, error: "Invalid email address" }, 400);
  }

  const emailHash = await hashEmail(email);

  // Turnstile gate — rejects scripted abuse. Real users pass invisibly.
  const clientIp = request.headers.get("CF-Connecting-IP") || "";
  const turnstileOk = await verifyTurnstile(turnstileToken, env, clientIp);
  if (!turnstileOk) {
    console.warn(`[subscribe:${emailHash}] turnstile rejected (source=${source})`);
    // Return 200 so the client UX (download) isn't blocked by a captcha failure,
    // but record the rejection so we don't silently lose visibility on abuse.
    return jsonResponse({ ok: true, warning: "verification_failed" }, 200);
  }

  console.log(
    `[subscribe:${emailHash}] accepted source=${source} bookId=${bookId || "-"}`,
  );

  // Build Virtuous payload. "Book Downloaded" is encoded into referenceSource
  // (e.g. "jo-equip-books:who-is-the-real-jesus") so automation rules can key
  // off it without needing custom-field support.
  const referenceSourceFull = bookId ? `${source}:${bookId}` : source;
  const payload = {
    contactType: "Household",
    name: email,
    referenceSource: referenceSourceFull,
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
  };

  // Hand off to the platform: respond to client immediately, run Virtuous
  // POST in the background so client latency is bounded by our own code,
  // not by the CRM's response time.
  ctx.waitUntil(sendToVirtuous(env, payload, emailHash));

  // Hint to clients that this response carries no useful body for caches.
  return jsonResponse({ ok: true }, 200);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/subscribe") {
      return handleSubscribe(request, env, ctx);
    }

    // Everything else: serve from the static assets binding.
    return env.ASSETS.fetch(request);
  },
};
