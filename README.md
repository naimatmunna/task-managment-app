# MERN Starter

A production-ready MERN foundation you can drop any product on top of — CRM, ERP, SaaS, e-commerce, internal tools. It ships with the parts every serious app needs and usually gets wrong: real authentication with refresh-token rotation, role + permission based authorization, a clean layered architecture, security hardening, API docs, tests, and Docker/CI.

The backend is verified (integration tests pass against an in-memory MongoDB). The frontend is verified (production build + lint + component test pass).

---

## Table of contents

1. [Stack](#stack)
2. [Architecture at a glance](#architecture-at-a-glance)
3. [Quick start](#quick-start)
4. [Environment variables](#environment-variables)
5. [Project structure](#project-structure)
6. [How authentication works](#how-authentication-works)
7. [How authorization (RBAC) works](#how-authorization-rbac-works)
8. [Optional infrastructure](#optional-infrastructure)
9. [Adding a new module](#adding-a-new-module)
10. [Testing](#testing)
11. [Docker & deployment](#docker--deployment)
12. [Seed accounts](#seed-accounts)
13. [Coding standards](#coding-standards)

---

## Stack

**Backend:** Node.js (ESM) · Express · MongoDB + Mongoose · JWT (access + refresh rotation) · Zod validation · Winston logging · Swagger/OpenAPI · Helmet/CORS/rate-limit/sanitization · Jest + Supertest.

**Frontend:** Vite · React 18 (JavaScript, no TypeScript) · Redux Toolkit + RTK Query · React Router · Tailwind CSS · Framer Motion · React Hook Form + Zod · dark mode · Vitest + Testing Library.

**Infra (optional, graceful):** Redis cache · BullMQ queue · Cloudinary storage · Socket.io. All degrade to in-memory/local defaults when unconfigured.

---

## Architecture at a glance

The backend follows a layered, dependency-inward design:

```
Request
  → Route (definition + validation + guards)
    → Controller (HTTP in/out only, no logic)
      → Service (business rules, orchestration)
        → Repository (data access; wraps Mongoose)
          → Model (schema)
```

Cross-cutting concerns live in dedicated layers: `middlewares/` (auth, validation, rate-limit, error handling), `security/` (sanitization, RBAC), `utils/` (logger, error/response envelopes, tokens), `loaders/` (DB, Swagger, sockets), and graceful-optional `cache/`, `queues/`, `storage/`.

**Why this shape:** controllers stay thin and swappable, business logic is testable without HTTP, and persistence is isolated behind repositories so you can change queries (or even the database) without touching services. Patterns used: **MVC**, **Service layer**, **Repository**, **Factory** (seed/test data), and a **composition root** (`server.js`) that wires everything at boot.

The frontend mirrors this with a **feature-based** structure: each domain (`features/auth`, `features/users`) owns its API endpoints and Redux slice, composed into a single RTK Query cache and store.

---

## Quick start

Prerequisites: Node ≥ 20, npm, and a MongoDB instance (local or Atlas). Docker optional.

```bash
# 1. Backend
cd backend
cp .env.example .env          # then edit secrets (see below)
npm install
npm run seed                  # optional: create demo accounts
npm run dev                   # http://localhost:5000  (docs at /docs)

# 2. Frontend (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev                   # http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:5000`, so no CORS setup is needed in development.

**Or run the whole stack with Docker:**

```bash
docker compose up --build     # frontend :8080 · api :5000 · mongo · redis
```

---

## Environment variables

Every variable is documented inline in `backend/.env.example`. The essentials:

| Variable | Required | Purpose |
|---|---|---|
| `MONGO_URI` | ✅ | MongoDB connection string |
| `JWT_ACCESS_SECRET` | ✅ | Signs short-lived access tokens (≥32 chars) |
| `JWT_REFRESH_SECRET` | ✅ | Signs refresh tokens — **must differ** from access secret |
| `COOKIE_SECRET` | ✅ | Signs the httpOnly refresh cookie |
| `CORS_ORIGINS` | — | Comma-separated allowlist (default: Vite dev origin) |
| `MAIL_*` | — | SMTP; if unset, emails are logged instead of sent |
| `REDIS_URL` | — | Enables Redis cache + (with `ENABLE_QUEUE`) BullMQ |
| `CLOUDINARY_URL` | — | Enables Cloudinary uploads (else local disk) |
| `ENABLE_SOCKET` | — | Turns on Socket.io |

Generate secrets with `openssl rand -hex 32`. Config is validated by Zod at boot (`src/config/env.js`) — the process exits immediately on invalid/missing values instead of failing mid-request.

---

## Project structure

```
mern-starter/
├── backend/
│   ├── src/
│   │   ├── config/          # env validation + namespaced config
│   │   ├── constants/       # roles, permissions, messages, http status
│   │   ├── loaders/         # db, swagger, socket bootstrap
│   │   ├── middlewares/     # auth, validate, rateLimit, error handler, requestId
│   │   ├── security/        # sanitization, RBAC role→permission map
│   │   ├── models/          # Mongoose schemas
│   │   ├── repositories/    # data access (BaseRepository + per-model)
│   │   ├── services/        # business logic (auth, token, user, email)
│   │   ├── controllers/     # thin HTTP handlers
│   │   ├── validators/      # Zod request schemas
│   │   ├── routes/v1/       # versioned route definitions (+OpenAPI docs)
│   │   ├── utils/           # logger, ApiError, ApiResponse, token, crypto, pagination
│   │   ├── cache/ queues/ storage/   # graceful-optional infra
│   │   ├── factories/ seeders/       # seed & test data
│   │   ├── app.js           # Express assembly (side-effect free → testable)
│   │   ├── server.js        # composition root + graceful shutdown
│   │   └── cluster.js       # optional multi-core entrypoint
│   ├── tests/               # Jest + Supertest integration tests
│   ├── scripts/seed.js
│   ├── Dockerfile · ecosystem.config.cjs (PM2)
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/             # RTK Query base (+ auto token-refresh) & root slice
│   │   ├── features/        # auth, users, theme (api + slice per feature)
│   │   ├── store/           # configureStore
│   │   ├── components/ui/   # Button, Input, Modal, Table, Pagination, …
│   │   ├── components/common/ # ErrorBoundary, PageMeta, ThemeToggle
│   │   ├── layouts/         # AuthLayout, DashboardLayout
│   │   ├── routes/          # AppRouter + guards (Protected/Guest/Role)
│   │   ├── pages/           # Landing, Login, Register, Dashboard, Users, …
│   │   ├── hooks/ helpers/ schemas/ lib/ config/
│   │   └── main.jsx · App.jsx
│   ├── Dockerfile · nginx.conf
│   └── .env.example
├── docker-compose.yml
├── .github/workflows/ci.yml
└── README.md
```

## How authentication works

- **Access token** (JWT, ~15 min) is returned in the login response body and held in memory on the client (mirrored to `localStorage` so a refresh survives).
- **Refresh token** (JWT, ~7 days) is sent as an **httpOnly, signed, SameSite=strict cookie** — never readable by JS, mitigating XSS token theft.
- **Rotation with reuse detection:** every `/auth/refresh` consumes the presented refresh token's hash and issues a new pair. Only hashes of currently-valid refresh tokens are stored on the user. If a token that was already rotated is presented again (a sign it leaked), **all sessions are revoked**. See `services/token.service.js`.
- On the client, `api/baseQuery.js` transparently catches a `401`, calls `/auth/refresh` once (single-flight, so concurrent 401s share one refresh), stores the new access token, and retries the original request.

Flows included: register, email verification, login, refresh, logout, forgot/reset password, change password. Password reset and email verification use single-use hashed tokens (raw value emailed, hash stored).

## How authorization (RBAC) works

Roles (`super_admin`, `admin`, `manager`, `user`) map to granular `resource:action` permissions in `security/rbac.js`. Route handlers gate access with middleware:

```js
router.post('/', requirePermissions(PERMISSIONS.USER_CREATE), validate(createUserSchema), createUser);
```

`requireRoles(...)` gates by role; `requirePermissions(...)` gates by permission (preferred — add capabilities without inventing roles). The frontend has a matching `usePermissions()` hook and `<RoleRoute>` guard, but **the server is always the source of truth** — client gating is UX only.

## Optional infrastructure

Redis, BullMQ, Cloudinary, and Socket.io are **graceful-optional**. Each has a clean interface with a zero-config default:

| Feature | Default (no config) | Activated by |
|---|---|---|
| Cache (`cache/`) | In-memory Map | `REDIS_URL` |
| Queue (`queues/`) | Inline await (runs job immediately) | `ENABLE_QUEUE=true` + `REDIS_URL` |
| Storage (`storage/`) | Local disk `./uploads` | `CLOUDINARY_URL` |
| Realtime (`loaders/socket.js`) | Off | `ENABLE_SOCKET=true` |

Your feature code calls the same `getCache()`, `dispatch()`, `getStorage()` API regardless — so you develop with nothing installed and scale up by setting env vars.

## Adding a new module

The layers make new resources mechanical. To add e.g. `Product`:

1. **Model** — `models/product.model.js` (Mongoose schema).
2. **Repository** — `repositories/product.repository.js` extending `BaseRepository` (you get `paginate`, `findById`, CRUD for free).
3. **Service** — `services/product.service.js` (business rules; call the repository).
4. **Validator** — `validators/product.validator.js` (Zod schemas for body/query/params).
5. **Controller** — `controllers/product.controller.js` (thin; use `catchAsync` + `ApiResponse`).
6. **Routes** — `routes/v1/product.routes.js`, gated with `authenticate` + `requirePermissions`, then register it in `routes/v1/index.js`.
7. **Permissions** — add `PRODUCT_*` to `constants/permissions.js` and grant them to roles in `security/rbac.js`.

On the frontend: add `features/products/productsApi.js` (inject endpoints into the root API) and pages/components. That's the whole pattern — copy the `user` module as a template.

## Testing

```bash
cd backend  && npm test     # Jest + Supertest, in-memory MongoDB (no external DB needed)
cd frontend && npm test     # Vitest + Testing Library
```

Backend integration tests cover the full auth flow (register, duplicate/validation rejection, login, bad credentials, `/me`, refresh rotation), health, and an RBAC denial. `tests/setup.js` spins up `mongodb-memory-server` so tests are hermetic.

## Docker & deployment

- **Local/full stack:** `docker compose up --build` (Mongo + Redis + API + nginx-served frontend).
- **Backend image:** multi-stage `node:22-alpine`, runs as non-root, includes a healthcheck hitting `/api/v1/health`.
- **Frontend image:** builds static assets, serves via nginx with SPA fallback and an `/api` proxy.
- **PM2:** `pm2 start ecosystem.config.cjs --env production` for clustered process management outside containers.
- **CI:** `.github/workflows/ci.yml` lints + tests the backend and lints + tests + builds the frontend on every push/PR.

## Seed accounts

After `npm run seed` (all password `Password123!`):

| Email | Role |
|---|---|
| superadmin@example.com | super_admin |
| admin@example.com | admin |
| manager@example.com | manager |
| user@example.com | user |

## Coding standards

- **ESM** everywhere, Node ≥ 20.
- **ESLint + Prettier** enforced (configs at each package root).
- Controllers never contain business logic; services never touch `req`/`res`.
- All responses use the `ApiResponse` envelope; all thrown errors use `ApiError`.
- Every request is validated by Zod before reaching a controller.
- Secrets only via env; config validated at boot.

---

Built as a foundation — delete the `Landing` page, rename the brand, add your modules, and ship.
