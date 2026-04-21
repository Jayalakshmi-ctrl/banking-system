# Smart Apartment Maintenance System — Frontend

React (Vite, TypeScript) single-page application. All API calls go to the **API gateway** (`VITE_API_URL`), not to individual microservices.

## Prerequisites

- Node.js 20+ recommended
- Backend gateway running (default `http://localhost:8000`)

## Quick start

```bash
cp .env.example .env
npm install
npm run dev
```

From the project root you can start the full stack (backend + this UI) with `../scripts/dev-local.sh` after `npm install` here once.

Open the URL printed by Vite (typically `http://localhost:5173`).

## Environment

| Variable       | Description                          |
|----------------|--------------------------------------|
| `VITE_API_URL` | Base URL of the gateway (no trailing slash) |

## Scripts

| Command       | Action                |
|---------------|-----------------------|
| `npm run dev` | Development server    |
| `npm run build` | Production build    |
| `npm run preview` | Preview production build |
| `npm run test` | Vitest unit tests |

## Component map

- `src/context/AuthContext.tsx` — JWT in `sessionStorage`, `/auth/me` bootstrap
- `src/api/client.ts` — Fetch wrapper and domain calls
- `src/pages/` — Login, register, resident, admin, staff views
- `src/components/AppShell.tsx` — Layout and navigation
- `src/components/RequireRole.tsx` — Route guards by role

## Seeded backend users (when using demo Docker Compose)

Documented in the backend `README.md` (admin and maintenance staff). Residents self-register from the UI.
