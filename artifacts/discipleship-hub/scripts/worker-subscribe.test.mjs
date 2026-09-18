import assert from "node:assert/strict";
import test from "node:test";

import worker from "../worker/index.js";

const SUBSCRIBE_URL = "https://equip.jesusonline.com/api/subscribe";
const VALID_BODY = {
  email: "reader@example.com",
  source: "jo-equip-books",
  book_id: "who-is-the-real-jesus",
  turnstile_token: "valid-token",
};

function subscribeRequest(body = VALID_BODY) {
  return new Request(SUBSCRIBE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "CF-Connecting-IP": "203.0.113.10",
    },
    body: JSON.stringify(body),
  });
}

function executionContext() {
  const promises = [];
  return {
    promises,
    waitUntil(promise) {
      promises.push(promise);
    },
  };
}

test("missing Turnstile secret fails closed without scheduling a CRM write", async () => {
  const ctx = executionContext();
  const originalFetch = globalThis.fetch;
  let outboundRequests = 0;
  globalThis.fetch = async () => {
    outboundRequests += 1;
    throw new Error("No outbound request is allowed");
  };

  try {
    const response = await worker.fetch(
      subscribeRequest(),
      { VIRTUOUS_API_KEY: "test-key" },
      ctx,
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      ok: true,
      warning: "verification_failed",
    });
    assert.equal(ctx.promises.length, 0);
    assert.equal(outboundRequests, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("verified Turnstile token schedules the Virtuous write", async () => {
  const ctx = executionContext();
  const originalFetch = globalThis.fetch;
  const outboundUrls = [];
  globalThis.fetch = async (url) => {
    outboundUrls.push(String(url));
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const response = await worker.fetch(
      subscribeRequest(),
      {
        TURNSTILE_SECRET_KEY: "test-secret",
        VIRTUOUS_API_KEY: "test-key",
      },
      ctx,
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
    assert.equal(ctx.promises.length, 1);
    await Promise.all(ctx.promises);
    assert.deepEqual(outboundUrls, [
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      "https://api.virtuoussoftware.com/api/Contact",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});