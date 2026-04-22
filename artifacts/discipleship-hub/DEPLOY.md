# Deploying JO EQUIP to Cloudflare Pages

The site is a static React/Vite build with no server, no database, and no
per-user state — ideal for Cloudflare Pages' free tier.

The deploy loop, once set up, is:

> **edit here in Replit → push to GitHub → Cloudflare auto-builds → live on `equip.jesusonline.com`** (≈90 seconds)

---

## One-time setup

### 1. Push this Replit project to GitHub

In the Replit workspace sidebar, open the **Git** pane (the branch icon).

1. Click **Connect to GitHub**, authorize Replit, and pick (or create) a
   repository — e.g. `jesusonline/equip` or `<your-user>/jo-equip`.
   Make it **private** if you prefer.
2. Click **Commit & push**. The whole monorepo goes up. The `.gitignore`
   already excludes `node_modules`, `dist`, and build artifacts.

From now on, every change you and I make in Replit can be pushed with one
click in that same Git pane.

### 2. Create the Cloudflare Pages project

In your Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.

Pick the repo you just pushed. Then enter these settings **exactly**:

| Field                       | Value                                                                   |
| --------------------------- | ----------------------------------------------------------------------- |
| Production branch           | `main`                                                                  |
| Framework preset            | **None** (don't pick Vite — this is a monorepo)                         |
| Build command               | `pnpm install --frozen-lockfile && pnpm --filter @workspace/discipleship-hub run build` |
| Build output directory      | `artifacts/discipleship-hub/dist/public`                                |
| Root directory (advanced)   | *(leave blank — keep the repo root)*                                    |

#### Environment variables (Build → Add variable)

Set both for the **Production** and **Preview** environments:

| Name          | Value  | Why                                                       |
| ------------- | ------ | --------------------------------------------------------- |
| `NODE_VERSION`| `20`   | Cloudflare defaults to Node 18; Vite 7 needs 20+          |
| `BASE_PATH`   | `/`    | Required by `vite.config.ts`; `/` = serve at domain root  |
| `PORT`        | `3000` | Required by `vite.config.ts` even at build time           |

Click **Save and Deploy**. The first build takes 2–3 minutes.

### 3. Point `equip.jesusonline.com` at the Pages project

After the first deploy succeeds, in the Pages project:

1. Go to **Custom domains → Set up a custom domain**.
2. Enter `equip.jesusonline.com`.
3. Cloudflare will offer to create the DNS record automatically (assuming
   `jesusonline.com` is on Cloudflare DNS) — accept it. It creates a `CNAME`
   from `equip` → `<your-pages-project>.pages.dev`, proxied (orange cloud on).
4. SSL is provisioned automatically in a few minutes.

That's it — `https://equip.jesusonline.com` is live, globally cached, with
free SSL.

---

## The day-to-day loop

1. Make changes here in Replit (preview pane updates instantly, like always).
2. When you're happy, open the **Git** pane → **Commit & push**.
3. Cloudflare detects the push and rebuilds. ~90 seconds later the change
   is live worldwide.

### Rolling back

Cloudflare keeps every deploy. **Pages project → Deployments → … → Rollback**
puts the previous version live in seconds.

### Preview deploys

Every Git branch (other than `main`) gets its own preview URL automatically,
e.g. `https://feature-x.<project>.pages.dev` — useful for showing drafts
before they go to the main domain.

---

## What's already configured for you

- `public/_redirects` — sends all unknown paths to `index.html` so deep links
  like `/channels/evidence/jesus-true-identity` work after a hard refresh.
- `public/favicon.svg` — referenced with a relative path so it works at any
  domain root.
- Build output goes to `dist/public/` (not the more common `dist/`) — that's
  why the output directory above ends in `/dist/public`.

---

## Troubleshooting

**Build fails with "PORT environment variable is required"** — you forgot to
set `PORT=3000` in the Pages env vars. Add it and re-deploy.

**Build fails on `pnpm install` with "lockfile is not up to date"** — drop
`--frozen-lockfile` from the build command, or run `pnpm install` locally
and push the updated `pnpm-lock.yaml`.

**404 on a deep link** (e.g. visit `equip.jesusonline.com/welcome` directly) —
confirm `public/_redirects` shipped to `dist/public/_redirects` after the
build. Vite copies everything in `public/` automatically.
