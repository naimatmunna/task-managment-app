# Backend — MERN Starter API

Express + MongoDB API with layered architecture, JWT auth (refresh rotation), RBAC, and graceful-optional infra. See the [root README](../README.md) for the full guide.

## Commands
```bash
npm run dev            # start with nodemon
npm start              # start
npm run start:cluster  # multi-core via node:cluster
npm run seed           # seed demo users  (--destroy to wipe)
npm test               # Jest + Supertest (in-memory Mongo)
npm run lint           # ESLint
```

## Layers
`routes → controllers → services → repositories → models`, with `middlewares`, `security`, `utils`, and graceful-optional `cache`/`queues`/`storage`. Add a module by copying the `user` slice across those layers (see root README → "Adding a new module").

API docs: `http://localhost:5000/docs` (Swagger UI).
