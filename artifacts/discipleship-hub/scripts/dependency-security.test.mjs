import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import test from "node:test";

// Resolve through the actual parent, not a separate test-only installation.
const require = createRequire(import.meta.url);
const astroRequire = createRequire(require.resolve("astro/package.json"));
const CachePolicy = astroRequire("http-cache-semantics");
const devalue = await import(pathToFileURL(astroRequire.resolve("devalue")).href);
const reactRequire = createRequire(require.resolve("@astrojs/react"));

const request = { url: "https://example.test/image", method: "GET", headers: { host: "example.test" } };
const staleRequest = (directive) => ({
  ...request,
  headers: { ...request.headers, "cache-control": directive },
});

const blockedResponses = [
  ["shared cookies", { "set-cookie": "session=test", "cache-control": "max-age=60" }],
  ["private", { "cache-control": "private, max-age=60" }],
  ["no-store", { "cache-control": "no-store, max-age=60" }],
  ["no-cache", { "cache-control": "no-cache, max-age=60" }],
  ["proxy-revalidate", { "cache-control": "proxy-revalidate, max-age=60" }],
  ["zero lifetime", { "cache-control": "max-age=0" }],
  ["wildcard vary", { vary: "*", "cache-control": "max-age=60" }],
  ["authenticated request", { "cache-control": "max-age=60" }, { authorization: "Bearer test" }],
  ["request no-store", { "cache-control": "max-age=60" }, { "cache-control": "no-store" }],
];

for (const [name, headers, requestHeaders = {}] of blockedResponses) {
  test(`security-zeroed cache cannot be reused: ${name}`, () => {
    const policy = new CachePolicy(
      { ...request, headers: { ...request.headers, ...requestHeaders } },
      { status: 200, headers: {
        ...headers,
        "cache-control": `${headers["cache-control"]}, stale-while-revalidate=3600, stale-if-error=3600`,
      } },
    );
    // Test both a new policy and one restored from a disk/shared cache.
    for (const entry of [policy, CachePolicy.fromObject(policy.toObject())]) {
      const responseTime = entry.now();
      entry.now = () => responseTime + 1000;
      assert.equal(entry.maxAge(), 0);
      assert.equal(entry.timeToLive(), 0);
      assert.equal(entry.useStaleWhileRevalidate(), false);
      for (const directive of ["max-stale", "max-stale=999999999", "max-stale=0", ""]) {
        const nextRequest = staleRequest(directive);
        const result = entry.evaluateRequest(nextRequest);
        assert.equal(result.response, undefined);
        assert.equal(result.revalidation.synchronous, true);
        assert.equal(entry.satisfiesWithoutRevalidation(nextRequest), false);
      }
      const failed = entry.revalidatedPolicy(request, { status: 503, headers: {} });
      assert.equal(failed.policy._status, 503, "stale-if-error must not resurrect a blocked response");
    }
  });
}

test("safe public caching and positive-TTL stale handling are preserved", () => {
  const policy = new CachePolicy(request, { status: 200, headers: {
    "cache-control": "public, max-age=60, stale-while-revalidate=3600, stale-if-error=3600",
  } });
  const responseTime = policy.now();
  policy.now = () => responseTime + 1000;
  assert.equal(policy.satisfiesWithoutRevalidation(request), true);
  assert.ok(policy.timeToLive() > 0);
  policy.now = () => responseTime + 120000;
  assert.equal(policy.satisfiesWithoutRevalidation(staleRequest("max-stale=300")), true);
  assert.equal(policy.useStaleWhileRevalidate(), true);
  assert.equal(policy.revalidatedPolicy(request, { status: 503, headers: {} }).policy, policy);
});

test("private caches can still reuse their own cookie responses", () => {
  const policy = new CachePolicy(request, { status: 200, headers: {
    "set-cookie": "session=test", "cache-control": "private, max-age=60",
  } }, { shared: false });
  assert.equal(policy.satisfiesWithoutRevalidation(request), true);
});

test("Astro and React use the same patched devalue with working round trips", () => {
  assert.equal(reactRequire.resolve("devalue"), astroRequire.resolve("devalue"));
  const value = { date: new Date("2026-01-01"), map: new Map([["key", 42]]) };
  value.self = value;
  const restored = devalue.parse(devalue.stringify(value));
  assert.equal(restored.self, restored);
  assert.deepEqual(restored.date, value.date);
  assert.deepEqual(restored.map, value.map);
  assert.throws(() => devalue.parse('[{"__proto__":1},{}]'), /__proto__/);
});

test("devalue emits sparse-safe uneval output", () => {
  const value = [];
  value.length = 1_000_000;
  value[999_999] = "last";
  const serialized = devalue.uneval(value);
  assert.ok(serialized.length < 500, "output must not expand array holes");
  const restored = Function(`return (${serialized})`)();
  assert.equal(restored.length, value.length);
  assert.deepEqual(Object.keys(restored), ["999999"]);
});