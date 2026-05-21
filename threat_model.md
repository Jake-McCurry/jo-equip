# Threat Model

## Project Overview

This repository is a pnpm monorepo with several artifacts, but the meaningful production surface for this scan is the public JO EQUIP site in `artifacts/discipleship-hub`. That site is a static Astro application deployed behind a Cloudflare Worker (`worker/index.js`) that serves static assets and handles `POST /api/subscribe` for book-download email capture forwarding to Virtuous CRM. A separate Replit autoscale deployment exists for this workspace, but the checked-in Express app currently exposes only a health endpoint and does not process user accounts, payments, uploads, or user-owned server state.

Production assumptions for this scan:
- `artifacts/discipleship-hub` is public internet-facing.
- `artifacts/mockup-sandbox` is dev-only and should be ignored unless production reachability is shown.
- `artifacts/api-server` is production-reachable only as a minimal health service unless new routes are added.
- TLS is provided by the platform.

## Assets

- **Subscriber email addresses and consent state** — the Worker accepts email addresses and forwards them into Virtuous as opted-in contacts. Incorrect handling can create privacy, spam, and reputation risk.
- **CRM API credentials** — `VIRTUOUS_API_KEY` and `TURNSTILE_SECRET_KEY` protect outbound CRM operations and anti-bot validation.
- **Site integrity and reputation** — the public site represents a ministry brand; abuse of public forms or injected content can harm trust even without account compromise.
- **Analytics and third-party embeds** — GTM and Virtuous embed code run with access to user browsers and must not become a path for data exposure beyond intended collection.

## Trust Boundaries

- **Browser to Cloudflare Worker** — all `/api/subscribe` requests cross from untrusted clients into server-side processing. Request bodies, query params, headers, and origin context are attacker-controlled.
- **Worker to external services** — the Worker calls Cloudflare Turnstile verification and Virtuous CRM with secrets. Fail-open behavior or over-trusting upstream assumptions can enable abuse.
- **Static content authors to rendered HTML** — some article content is rendered with `set:html`, so only repository-controlled content may flow into those sinks.
- **Repository code to deployment configuration** — secrets and deployment visibility materially affect exploitability. Production security controls must not rely on optional, silently missing configuration for core abuse prevention.

## Scan Anchors

- Production entry points: `artifacts/discipleship-hub/src/pages/**`, `artifacts/discipleship-hub/worker/index.js`, `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/app.ts`.
- Highest-risk code area: `artifacts/discipleship-hub/worker/index.js` because it accepts public input and forwards data to a privileged third-party API.
- Public surfaces: all Astro routes under `artifacts/discipleship-hub/src/pages/**`, especially `/books`, `/newsletter`, `/playlist/[id]`, and Worker route `/api/subscribe`.
- Dev-only areas usually out of scope: `artifacts/mockup-sandbox/**`, build scripts under `scripts/**`, generated static assets under `dist/**`.

## Threat Categories

### Spoofing

There is no user authentication surface in the production JO EQUIP site, but the Worker still has to distinguish legitimate book-download signups from automated or forged submissions. The system must treat all client-submitted identity claims, including email addresses and claimed opt-in state, as untrusted until sufficient proof or anti-abuse controls are applied.

Required guarantees:
- Public signup endpoints MUST not treat a submitted email address as verified ownership of that mailbox.
- Anti-bot controls for public form submission MUST fail closed for production traffic, or the deployment process and deployment documentation MUST guarantee their presence before a live release.

### Tampering

The client can freely modify `source`, `book_id`, and other request fields before they reach the Worker. The Worker must constrain and validate every field that influences downstream CRM records or operational logging.

Required guarantees:
- Public request fields forwarded to Virtuous MUST be validated against expected formats or allowlists, not only truncated.
- Server-side logic MUST not rely on client-side UI flows to enforce business rules.

### Information Disclosure

The main sensitive data here is email addresses, secrets, and any internal error detail exposed through logs or responses. The Worker already avoids logging raw emails, and the Express logger redacts cookies and authorization headers.

Required guarantees:
- Raw subscriber emails and secrets MUST NOT appear in logs or client-visible error responses.
- Third-party scripts and embeds MUST receive only the minimum data intentionally shared with them.

### Denial of Service

The public site contains an unauthenticated endpoint that can trigger third-party API calls. Even if the client experience is decoupled with `ctx.waitUntil`, repeated abuse can still consume provider quota, pollute CRM data, or degrade operational usefulness.

Required guarantees:
- Public submission endpoints MUST include effective abuse controls proportionate to the cost of each downstream action.
- External calls MUST remain bounded in latency and failure impact so abuse does not degrade the site.
- Production deployment instructions MUST treat anti-abuse secrets for privileged public endpoints as required configuration, not optional hardening.

### Elevation of Privilege

There is no classic role-based privilege model in the public site, but the Worker effectively holds privilege to create or update CRM records using a secret bearer token. Any public input path that can make the Worker perform privileged actions on behalf of an attacker is an elevation-of-privilege concern.

Required guarantees:
- The Worker MUST only perform privileged CRM actions that correspond to the intended public workflow.
- The Worker MUST NOT continue privileged CRM writes when required anti-abuse configuration such as `TURNSTILE_SECRET_KEY` is missing.
- Author-controlled HTML rendered via `set:html` MUST never become user-controlled input without introducing sanitization first.
