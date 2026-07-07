# Task Management

A modern, multi-tenant team task-management app — a lean, focused alternative to Jira/Linear/Asana. Built on the MERN stack (MongoDB · Express · React · Node), plain JavaScript (ES modules) end to end.

Sign up creates your organization, verifies you with an emailed 6-digit code, and drops you into a Kanban board where your team plans, assigns, and ships work. Every byte of data is scoped to an organization — one tenant can never see another's.

- **Auth:** email + password with a **6-digit OTP** (signup verification, optional login 2FA, password reset). Access/refresh JWTs with refresh-token **rotation + reuse detection**; refresh token in an httpOnly, signed, SameSite cookie.
- **Multi-tenant:** `Organization` → `Membership` (roles `owner`/`admin`/`member`) → teams, tasks, notifications, reports. Every request resolves an active org (`x-org-id` header) and is authorized against the caller's membership.
- **Tasks:** Kanban board with drag-and-drop across/within columns (float ordering), a dense filterable/sortable list, quick-add, a task detail panel with inline edits, an activity log, and comments. Filters persist in the URL.
- **Notifications:** in-app bell with unread count + email when a task is assigned to you.
- **Reports:** on-demand daily/weekly/monthly summaries by org/team/me — summary cards, charts (status donut, completion trend, workload), and CSV / PDF export or "email me this report".
- **Design:** Apple-grade, calm UI with light/dark mode, a `⌘K` command palette, skeleton loaders, empty states, optimistic updates, and toasts on every mutation.

---

## Tech stack

**Backend** — Node (ESM) · Express · MongoDB + Mongoose · JWT · `bcryptjs` · `zod` validation · `nodemailer` · `helmet`/`cors`/`hpp`/rate-limit/mongo-sanitize · `pdfkit` · Winston · Swagger · Jest + Supertest (in-memory Mongo).

**Frontend** — Vite · React 18 (JS/JSX) · **Redux Toolkit + RTK Query** (server state, cache, single-flight token refresh) · React Router · Tailwind CSS · `@dnd-kit` (drag-drop) · `recharts` · `framer-motion` · `react-hook-form` + `zod` · `lucide-react` · `date-fns` · `react-hot-toast` · Vitest.

> **Note on a couple of stack choices.** This project extends an existing production-grade MERN scaffold. Two libraries differ from a from-scratch spec, deliberately: **RTK Query** is kept instead of TanStack Query (it already provides caching, tags, optimistic updates and battle-tested transparent token-refresh), and **`bcryptjs`** is kept instead of native `bcrypt` (pure-JS, no native build step). Both are functional equals for this app.

---

## Quick start

Prerequisites: **Node ≥ 20**, npm, and a **MongoDB** instance (local or Atlas).

```bash
# 1. Backend
cd backend
cp .env.example .env          # defaults work for local dev; set MONGO_URI
npm install
npm run seed                  # optional: demo org, users, teams & tasks
npm run dev                   # http://localhost:5000  (API docs at /docs)

# 2. Frontend (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev                   # http://localhost:5173
```

The Vite dev server proxies `/api` → `http://localhost:5000`, so there's no CORS setup in development.

**No SMTP? No problem.** If `MAIL_*` is unset, emails (OTP codes, invites, assignment alerts, reports) are logged to the server console instead of sent, and — outside production — OTP codes and invite links are returned in API responses and shown in the UI so you can complete every flow without a mailbox.

---

## Seed accounts

After `npm run seed` (all demo accounts share the password `Password123!`):

| Email | Role in **Acme Inc** |
|---|---|
| owner@Task Management.app | owner |
| admin@Task Management.app | admin |
| priya@Task Management.app | member |
| diego@Task Management.app | member |
| emma@Task Management.app | member |

The demo org ships with two teams (Engineering, Design) and 15 tasks spread across every status, priority, and assignee. Reset with `npm run seed:destroy`.

---

## Environment variables

Everything is documented inline in `backend/.env.example`. Essentials:

| Variable | Required | Purpose |
|---|---|---|
| `MONGO_URI` | ✅ | MongoDB connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | ✅ | Sign access / refresh tokens (≥32 chars, **must differ**) |
| `COOKIE_SECRET` | ✅ | Signs the httpOnly refresh cookie |
| `APP_NAME` | — | Brand name in emails (default `Task Management`) |
| `OTP_LENGTH` / `OTP_EXPIRES_MIN` / `OTP_MAX_ATTEMPTS` | — | OTP tuning (6 digits · 10 min · 5 attempts) |
| `LOGIN_OTP_ENABLED` | — | Require an email OTP as a 2nd login step (off by default) |
| `INVITE_EXPIRES_DAYS` | — | Member-invite link lifetime (default 7) |
| `MAIL_*` | — | SMTP; if unset, emails are logged instead of sent |
| `CORS_ORIGINS` | — | Comma-separated allowlist (default: Vite dev origin) |

Frontend: `frontend/.env` needs only `VITE_API_URL` (default `/api/v1`) and `VITE_APP_NAME`.

---

## How multi-tenancy works

The security boundary lives in one middleware, `middlewares/resolveOrg.js`:

1. `authenticate` verifies the access token → `req.user`.
2. `resolveOrg` reads the `x-org-id` header (or falls back to the user's first active org), loads the caller's **active** `Membership`, and attaches `req.orgId` + `req.membership`. No membership → `403`.
3. Every tenant query filters by `req.orgId`; `requireOrgRole('admin')` gates privileged actions by membership role (owners rank above admins above members).

A user acting on an org they don't belong to gets `403 ORG_ACCESS_DENIED`; a task/team id from another org resolves to `404`. Both are covered by tests.

---

## API overview

REST under `/api/v1`, envelope `{ success, message, data, meta }`. Interactive docs at `/docs`.

```
/auth          signup · verify-otp · resend-otp · login · verify-login-otp · refresh · logout · me
               forgot-password · reset-password · change-password
/orgs          POST / (create) · current (get/update) · members (list/invite/:id role/:id remove)
               invite (peek) · invite/accept
/teams         CRUD (+ member rosters, admin-gated)
/tasks         list(+filters,pagination) · board · create · :id (get/update/delete)
               :id/reorder · :id/comment
/notifications list · :id/read · read-all
/reports       GET (range/scope/team) · export?format=csv|pdf · POST email
/health
```

Every body/query/param is Zod-validated; list endpoints support filtering, sorting and `?page=&limit=` pagination.

---

## Architecture

Layered, dependency-inward on the backend — `Route → Controller → Service → Repository → Model` — with cross-cutting concerns in `middlewares/`, `security/`, `utils/`, `loaders/`, and graceful-optional `cache/`, `queues/`, `storage/`. Controllers stay thin (HTTP only); services hold business rules; repositories wrap Mongoose.

```
backend/src/
  config/ constants/ loaders/ middlewares/ security/ utils/
  models/            Organization · Membership · Team · Task · Otp · Notification · User
  repositories/      one per model (extend BaseRepository)
  services/          auth · otp · token · email · org · team · task · notification · report
  controllers/ validators/ routes/v1/
  seeders/ scripts/seed.js

frontend/src/
  api/               RTK Query root + baseQuery (auto refresh + x-org-id injection)
  features/          auth · org · teams · tasks · notifications · reports · theme
  components/ui/     Button · Input · Select · Modal · Card · Avatar · Badge · EmptyState · Skeleton …
  components/app/    OrgSwitcher · NotificationBell · CommandPalette · PageHeader
  components/tasks/  TaskCard · TaskFormModal · TaskDetailPanel · TaskFilters · PriorityBadge
  hooks/ layouts/ pages/ routes/ schemas/ lib/
```

---

## Testing

```bash
cd backend  && npm test     # Jest + Supertest, in-memory MongoDB — no external DB needed
cd frontend && npm test     # Vitest + Testing Library
cd frontend && npm run build   # production build (also a good integration check)
```

Backend integration tests cover the full OTP auth flow, org/member/invite lifecycle, team management, task CRUD + board + reorder + assignment→notification, reports (JSON/CSV/PDF), the demo seeder, and — throughout — **multi-tenant isolation** (cross-org access denied, no data leakage). Run `npm run lint` in either package to check ESLint.

---

## Roadmap (Phase 2 — not built yet)

Comments with @mentions, attachments, subtasks/checklists, recurring tasks, saved views, sprints/milestones, per-org activity feed, Slack/webhooks, calendar view, time tracking, SSO, audit log, BullMQ+Redis queues, and scheduled auto-emailed reports.
