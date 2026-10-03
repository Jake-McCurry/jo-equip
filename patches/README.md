# Dependency security patch

`http-cache-semantics@4.2.0.patch` mitigates GHSA-ch52-4w7c-c8xp.
As of October 3, 2026, neither this package nor the latest Astro release
provides an upstream fix. pnpm applies the patch on installation and tracks
its hash in the lockfile; the package's upstream version is not relabeled.

The patch requires synchronous revalidation for zero-freshness responses,
including shared cookie responses, private/no-store/no-cache responses,
unauthorized shared caching, and proxy-revalidate responses. It also prevents
stale-while-revalidate, stale-if-error, and TTL calculations from reviving them.
As a conservative tradeoff, even an otherwise cacheable `max-age=0` response
must revalidate; positive-freshness public caching remains available.

Run `pnpm --filter @workspace/discipleship-hub run test:dependency-security`
to check the installed dependency through Astro, including serialized cache
entries and error fallback paths.

Version-based audits still report this advisory because 4.2.0 has no upstream
patched version. Do not suppress it or treat the audit as clean. Replace the
local patch with an audited upstream release when one becomes available, and
keep the regression tests.