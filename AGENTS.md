# Repository Guidelines

## Project Structure & Module Organization

This repository has two independent npm projects. `backend/` is a Hono + Node API with PostgreSQL; source lives in `backend/src/`, migrations in `backend/src/migrations/`, and Vitest suites in `backend/tests/`. `frontend/` is a React + Vite SPA; pages are in `frontend/src/pages/`, reusable UI in `frontend/src/components/`, API wrappers in `frontend/src/api/`, and global styles in `frontend/src/index.css`. `match_data/` contains CSDM JSON fixtures, and `uploads/` stores media.

## Build, Test, and Development Commands

Run commands from each package directory; there is no monorepo runner.

- `cd backend && npm run dev` starts the API on port `3001`.
- `cd backend && npm run build` compiles TypeScript to `backend/dist/`.
- `cd backend && npm run migrate` applies SQL migrations in lexical order.
- `cd backend && npm test` runs Vitest once; pass a file path for a single suite.
- `cd frontend && npm run dev` starts Vite with API/upload proxies.
- `cd frontend && npm run build` type-checks and creates the production bundle.
- `cd frontend && npm run preview` serves the built frontend locally.

## Coding Style & Naming Conventions

Use TypeScript and ESM throughout. Backend imports should keep `.js` specifiers for local TypeScript files, for example `import { query } from './db.js'`. Backend endpoints must return the shared `ok(...)` / `err(..., 'CODE')` shape from `backend/src/types.ts`. Group public routes by resource and admin-only handlers under `backend/src/routes/admin/`. Frontend components and pages use PascalCase filenames; API modules use lowercase resource names. Keep formatting consistent with nearby code; no lint command is configured.

## Testing Guidelines

Backend tests use Vitest and import the Hono app directly. Tests require `TEST_DATABASE_URL` and reset tables via helpers in `backend/tests/setup.ts`; keep table order FK-safe. Place new backend tests under `backend/tests/*.test.ts` and update `backend/tests/import.test.ts` when changing CSDM import behavior. The frontend currently relies on build-time type checking.

## Commit & Pull Request Guidelines

Recent history uses Conventional Commit prefixes such as `feat:`, `fix:`, and `chore:`. Keep subjects imperative and scoped to one change, for example `fix: handle missing team logos`. Pull requests should include a summary, test/build commands run, linked issue if applicable, and screenshots for UI changes. Note database migration, environment variable, or upload-path impacts.

## Security & Configuration Tips

Backend configuration comes from environment variables. Required values include `DATABASE_URL`, `TEST_DATABASE_URL`, `JWT_SECRET`, and `JWT_REFRESH_SECRET`; `UPLOADS_DIR` defaults to `/opt/alast/uploads`. Do not hardcode API hosts in the frontend; use the Vite proxy and `frontend/src/api/client.ts`.
