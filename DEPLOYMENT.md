# Deploying to Vercel (production)

This repo is a monorepo with two apps:

| App        | Path        | Vercel project type            |
| ---------- | ----------- | ------------------------------ |
| Frontend   | `frontend/` | Static site (Vite)             |
| Backend    | `backend/`  | Serverless function (Express)  |

They are deployed as **two separate Vercel projects**. The frontend proxies
`/api/*` to the backend so the browser only ever talks to one origin — this is
required because the refresh-token cookie is `httpOnly; SameSite=Strict`, which
a cross-site backend URL would silently drop.

## ⚠️ Serverless limitations (read first)

A Vercel serverless function has **no persistent process and no WebSockets**.
So on Vercel:

- **Realtime (Socket.io)** — not available. Keep `ENABLE_SOCKET=false`.
- **Background jobs (BullMQ)** — not available. Keep `ENABLE_QUEUE=false`.
- In-memory rate limiting is per-instance (best-effort only). Use a Redis-backed
  limiter if you need strict limits.

The REST API (auth, tasks, teams, etc. over MongoDB) works fine. If you later
need realtime/queues, host `backend/` on a persistent Node platform
(Render / Railway / Fly.io) instead and point the frontend proxy at it — no code
changes required.

## Prerequisites

- **MongoDB Atlas** cluster (there is no local Mongo in production). Copy its
  `mongodb+srv://…` connection string. Under *Network Access*, allow `0.0.0.0/0`
  (Vercel IPs are dynamic).
- A Vercel account.

---

## 1. Deploy the backend

1. New Vercel project → import this repo → set **Root Directory = `backend`**.
2. Add **Environment Variables** (Production):

   | Variable             | Value                                                             |
   | -------------------- | ---------------------------------------------------------------- |
   | `NODE_ENV`           | `production`                                                     |
   | `MONGO_URI`          | your Atlas `mongodb+srv://…` string                              |
   | `JWT_ACCESS_SECRET`  | 32+ random chars — `openssl rand -hex 32`                       |
   | `JWT_REFRESH_SECRET` | a **different** 32+ random string                               |
   | `COOKIE_SECRET`      | 16+ random chars                                                |
   | `COOKIE_SECURE`      | `true`  ← must be true so the cookie is sent over HTTPS         |
   | `CORS_ORIGINS`       | your frontend URL, e.g. `https://your-app.vercel.app`          |
   | `CLIENT_URL`         | same frontend URL (used in email links)                        |

   Optional: `MAIL_*` (SMTP — omit to log OTPs to the function logs),
   `CLOUDINARY_URL` (uploads). Leave `ENABLE_SOCKET` / `ENABLE_QUEUE` **unset**.

3. Deploy. Note the resulting URL, e.g. `https://propvia-backend.vercel.app`.
4. Sanity check: open `https://<backend-url>/api/v1` — you should get a JSON
   response from the API (not a 404 HTML page).

## 2. Point the frontend proxy at the backend

Edit [`frontend/vercel.json`](frontend/vercel.json) and replace the placeholder
host with your backend URL from step 1:

```json
{ "source": "/api/:path*", "destination": "https://propvia-backend.vercel.app/api/:path*" }
```

Commit the change.

## 3. Deploy the frontend

1. New Vercel project → same repo → set **Root Directory = `frontend`**.
2. Framework preset is auto-detected as **Vite** (build `npm run build`, output
   `dist`). No env vars are required — `VITE_API_URL` defaults to `/api/v1`,
   which the proxy forwards to the backend.
   - Optional: `VITE_APP_NAME`, `VITE_APP_DESCRIPTION`.
3. Deploy.

## 4. Verify

- Load the site → the login/signup UI renders and client-side routes (e.g.
  `/app/board`) work on refresh (SPA fallback).
- Sign up / log in → check the browser can set the refresh cookie and that
  `/api/v1/auth/refresh` succeeds (Network tab). If refresh fails, re-check
  `COOKIE_SECURE=true` and that `CORS_ORIGINS` contains the exact frontend URL.
- Create and drag tasks on the board.

## Notes

- **Cross-origin gotcha:** the frontend and backend live on different `*.vercel.app`
  domains, but because the browser calls `/api` on the *frontend* origin and
  Vercel rewrites it to the backend, cookies stay first-party. Do **not** set
  `VITE_API_URL` to the backend's absolute URL — that would make requests
  cross-site and break the `SameSite=Strict` cookie.
- **Custom domains:** put the frontend on `app.example.com`; keep the `/api`
  proxy as-is. Add the domain to the backend's `CORS_ORIGINS` and `CLIENT_URL`.
- **Cold starts:** the first request after idle reconnects to Mongo (~1–2s).
  The connection is cached for subsequent warm invocations.
