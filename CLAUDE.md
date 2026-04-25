# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ALAST Premier 2026 — a CS-tournament site (esports). Two independent npm projects:

- `backend/` — Hono + Node API on PostgreSQL (port 3001)
- `frontend/` — React 18 + Vite + Tailwind v4 SPA (Vite dev server proxies `/api` and `/uploads` to `:3001`)

There is no monorepo tooling; each side is installed and run separately.

## Common commands

Backend (`cd backend`):
- `npm run dev` — tsx watch, runs `src/index.ts`
- `npm run build` — `tsc` → `dist/` (used by the PM2 `ecosystem.config.cjs`)
- `npm run migrate` — applies SQL files in `src/migrations/` in lexical order, tracked via `_migrations` table
- `npm run setup-admin [username] [password]` — bcrypts a row into `admins` (defaults `admin` / `changeme123`)
- `npm test` — vitest, single fork. Tests hit a real Postgres at `TEST_DATABASE_URL` and `TRUNCATE ... CASCADE` between cases
- `npm test -- tests/matches.test.ts` — single file
- `npm test -- -t "creates match"` — single test by name

Frontend (`cd frontend`):
- `npm run dev` — Vite dev server (default 5173)
- `npm run build` — `tsc -b && vite build` (type check + bundle)
- `npm run preview` — serve the production build

Production process is run via PM2 from `/opt/alast/backend/dist/index.js` (see `ecosystem.config.cjs`).

## Environment

Backend reads via `dotenv/config`:
- `DATABASE_URL` (prod/dev) and `TEST_DATABASE_URL` (vitest, selected when `NODE_ENV=test`) — see `backend/src/db.ts`
- `JWT_SECRET`, `JWT_REFRESH_SECRET` — required for admin auth
- `UPLOADS_DIR` — defaults to `/opt/alast/uploads`; admin upload endpoint writes files under `teams/`, `players/`, `news/` subfolders
- `PORT` — defaults to 3001

Tests skip server start by checking `NODE_ENV !== 'test'` in `backend/src/index.ts`. Vitest runs with `singleFork: true` because tests share the database.

## Architecture

### Backend (Hono on Node)

`backend/src/index.ts` mounts public routes under `/api/*` and admin routes under `/api/admin/*`. The auth middleware is applied selectively to admin sub-routes (teams/players/matches/news/upload/import) — the login/refresh/logout sub-routes under `/api/admin` are intentionally unprotected.

- `routes/` — public read APIs (tournaments, teams, players, matches, news, stats, search)
- `routes/admin/` — write APIs plus `auth.ts` (login/refresh/logout), `upload.ts` (multipart media to `UPLOADS_DIR`), and `import.ts` (CSDM JSON ingest, see below)
- `middleware/auth.ts` — Bearer JWT verify; sets `c.set('jwtPayload', …)`
- `middleware/rate-limit.ts` — used on `/api/admin/login` (5 / 60s)
- `db.ts` — single `pg.Pool`, `query()` helper. All routes use this; do not create new pools
- `types.ts` — shared `ApiResponse<T>` discriminated union plus `ok()` / `err()` helpers. **Every endpoint returns this shape**; the frontend's `apiFetch` unwraps `data` and throws `ApiError` on `success: false`
- `migrate.ts` — idempotent runner over `src/migrations/*.sql`, transactional per file, tracked in `_migrations`

Auth flow: login issues a 15m access token (returned in JSON) and a 7d refresh token (httpOnly cookie scoped to `/api/admin/refresh`). The refresh endpoint rotates both. Frontend stores access token client-side; refresh uses the cookie only.

### Database

Single SQL migration at `backend/src/migrations/001_initial_schema.sql`. Schema graph:

```
tournaments ─┬─ matches ── match_maps ── player_match_stats ── players ── teams
             └─ news (optional FK to matches)
admins · csdm_imports · media
```

Important constraints:
- `players.role` is a CHECK enum: `rifler|awper|igl|support|lurker`
- `matches.status` CHECK: `upcoming|live|finished`
- `news.category` CHECK: `战报|资讯|专访` (Chinese — battle report / news / interview)
- `match_maps` has `UNIQUE (match_id, map_order)`; `player_match_stats` has `UNIQUE (match_map_id, player_id)`
- `csdm_imports.status`: `pending|confirmed|failed`

### CSDM import pipeline

The admin `/api/admin/import` flow ingests CounterStrike Demo Manager JSON exports. Two-step:

1. `POST /preview` — uploads JSON, returns a "match status" per team and per player (`matched` / `new` / `team_missing`) so the admin can map names→ids before commit. Stored in `csdm_imports` with `status='pending'`.
2. `POST /confirm` — writes `match_maps` + `player_match_stats` rows; `imported_from_csdm = true`. Marks the import row `confirmed`.

Sample fixtures live in `match_data/` (gitignored). When changing import code, update `backend/tests/import.test.ts`.

### Frontend (React + Vite + Tailwind v4)

- Routing in `src/App.tsx` (react-router-dom v6, all routes wrapped in a single `Layout`)
- API layer in `src/api/` — `client.ts` defines `apiFetch<T>` and `ApiError` matching the backend's `ApiResponse<T>` shape. Per-resource files (`teams.ts`, `matches.ts`, …) are typed wrappers
- Data fetching uses `@tanstack/react-query`
- Charts use `echarts` via `echarts-for-react`
- State that needs to cross routes uses `zustand`
- Tailwind v4 is wired through the `@tailwindcss/vite` plugin (no `tailwind.config.js`); design tokens live as CSS variables in `src/index.css`
- Vite proxies `/api` and `/uploads` to `http://localhost:3001` in dev (see `frontend/vite.config.ts`) — never hardcode the API host

## Conventions specific to this repo

- ESM throughout. Both packages use `"type": "module"`. Backend imports use `.js` extensions even though sources are `.ts` (NodeNext resolution): `import x from './db.js'`. Keep this when adding new files.
- Backend tests import the Hono `app` directly and call `app.request(...)` rather than booting an HTTP server.
- Tests reset state with `resetTables('table1', 'table2', ...)` from `tests/setup.ts` — pass tables in FK-safe order (children first) to avoid CASCADE surprises on shared rows.
- All new endpoints must return `ok(...)` / `err(..., 'CODE')`. Don't return raw objects or use Hono's default error responses — the frontend's `apiFetch` will throw on anything that doesn't match `{ success, data | error, code }`.
