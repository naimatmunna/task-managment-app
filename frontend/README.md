# Frontend — MERN Starter

Vite + React 18 + Redux Toolkit (RTK Query) + Tailwind. Feature-based structure with transparent access-token refresh. See the [root README](../README.md) for the full guide.

## Commands
```bash
npm run dev      # Vite dev server (proxies /api → :5000)
npm run build    # production build
npm run preview  # preview the build
npm test         # Vitest + Testing Library
npm run lint     # ESLint
```

## Structure
`api/` (RTK Query base + root slice), `features/` (auth, users, theme), `store/`, `components/ui` + `components/common`, `layouts/`, `routes/` (+ guards), `pages/`, `hooks/`, `helpers/`, `schemas/`. Add a feature by injecting endpoints into the root API slice and adding pages.
