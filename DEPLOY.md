# Deploying `gotc-client` to Vercel

Everything Vercel needs is committed: `vercel.json`, `.env.production`, `.vercelignore`, and
`engines.node` in `package.json`. Vercel auto-detects Vite, so there is nothing to configure
in the dashboard beyond connecting the repository.

**One thing you must edit before it works**: the API host in `vercel.json`. Read §1.

---

## 1. The one decision that matters: where `/api` goes

The client calls `/api/...` and sends `credentials: 'include'`. The session is an **httpOnly
cookie** the server sets with `sameSite: 'lax'`.

That single flag decides the whole deployment shape:

> A `SameSite=Lax` cookie is **not sent on cross-site XHR**. If the browser loads the app from
> `gotc.vercel.app` and calls `api.example.com` directly, sign-in appears to succeed and then
> **every following request returns 401** — the browser silently withholds the cookie.

So there are two options, and the first is strongly preferred.

### A. Proxy `/api` through Vercel — recommended, no server changes

The browser only ever talks to your Vercel domain; Vercel forwards `/api/*` to the API
server-to-server. The cookie stays first-party and `SameSite=Lax` keeps working.

Open `vercel.json` and replace the placeholder host:

```jsonc
{
  "source": "/api/:path*",
  "destination": "https://gotc-api.onrender.com/api/:path*"   // ← your API's HTTPS origin
}
```

Leave `.env.production` as `VITE_API_BASE=/api`. Done — nothing else changes.

### B. Call the API cross-origin — only if you have a reason

Set `VITE_API_BASE` in the Vercel dashboard to the full URL (`https://api.example.com/api`)
and delete the `/api` rewrite from `vercel.json`. Then you **must** also change the server, or
authentication will not work:

| File | Change |
|---|---|
| `gotc-server/src/controllers/auth.controller.ts` | `sameSite: 'lax'` → `'none'` (and `secure: true`, which `isProduction` already gives you — `SameSite=None` is rejected without it) |
| `gotc-server/.env` | `CLIENT_ORIGIN=https://your-app.vercel.app` — the CORS allowlist is a single exact origin |

Note that Vercel gives every preview deployment its own subdomain, so a single
`CLIENT_ORIGIN` will only match production. That is the main reason to prefer A.

---

## 2. Deploy

```bash
cd gotc-client
npx vercel            # first run links the project and deploys a preview
npx vercel --prod     # promote to production
```

Or connect the repository in the Vercel dashboard:

- **Root Directory**: `gotc-client` — it matters, the repo root is the handoff bundle
- **Framework Preset**: Vite (auto-detected)
- **Build Command / Output Directory / Install Command**: already set in `vercel.json`

`npm run build` runs `tsc -b && vite build`, so **a type error fails the deployment**. Run
`npm run build` locally before pushing.

---

## 3. What the config does

| File | Why it is there |
|---|---|
| `vercel.json` → SPA rewrite | React Router owns `/garments/:id`, `/orders/:id` and the rest. Without `/(.*) → /index.html`, a reload or a shared link on any route but `/` returns **404**. Vercel checks the filesystem first, so real files under `/assets` are still served directly. |
| `vercel.json` → `/api` rewrite | Keeps the session cookie first-party (§1). |
| `vercel.json` → headers | `/assets/*` cached immutably (Vite fingerprints the filenames); `/api/*` set to `no-store` so no session response is ever cached at the edge; plus `nosniff`, `DENY` framing, and a referrer policy. |
| `.env.production` | `VITE_API_BASE=/api`. Vite inlines this **at build time** — changing it in the dashboard needs a redeploy, not just a restart. |
| `engines.node` | Pins Vercel to Node 20+. |
| `.vercelignore` | Keeps the docs out of the build context. |

There is **no CSP header**. The app loads Archivo and IBM Plex Mono from Google Fonts, so a
default-deny policy would need `font-src fonts.gstatic.com` and
`style-src fonts.googleapis.com`. Add it deliberately if you want it, and test the fonts.

---

## 4. Before it will actually work

The frontend is a static bundle — it has no data of its own. For a deployed client to be
usable:

- [ ] The API is reachable over **HTTPS** at a public host. It cannot be `localhost`, and it
      cannot be plain `http` — the browser blocks mixed content from an HTTPS page.
- [ ] The API runs with `NODE_ENV=production`, so the session cookie is issued `Secure`.
- [ ] MongoDB Atlas → **Network Access** allows the API host's IP (`0.0.0.0/0` for a hosted
      service with dynamic egress). The intermittent `ENOTFOUND` failures seen in testing came
      from here, not from the code.
- [ ] The database is seeded: `npm run seed:reset` against the production `MONGODB_URI`.

The API is a long-lived Express process holding a Mongoose pool and an in-memory role-matrix
cache, so it belongs on a container host (Render, Railway, Fly, a VM) rather than on
serverless functions.

---

## 5. Verify the deployment

1. Open the deployment URL — the sign-in page renders.
2. Sign in as `r.fernando@factory.lk` / `demo1234`. **Now reload the page.** If you land back
   on sign-in, the cookie is not sticking — that is §1, not a bug in the app.
3. Navigate to a garment, copy the URL, open it in a new tab. A `404` here means the SPA
   rewrite is not being applied.
4. Open a cone order and press **Print** — the browser preview should show one clean A4
   landscape page with no sidebar.
5. Check the Network tab: `/api/auth/me` should be `200`, served from your Vercel domain.
