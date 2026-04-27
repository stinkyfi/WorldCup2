# Story 1.8: Backend repo — init & config

Status: done

## Story

As a developer,
I want a fully configured Fastify TypeScript backend in `backend/` with Prisma ORM, PostgreSQL in Docker, and the base project structure,
So that API and indexer development can begin with consistent tooling and a working local database.

## Acceptance Criteria

1. **Given** no `backend/` directory **When** initialisation completes **Then** `backend/` exists with Fastify + TypeScript, Prisma, `prisma/schema.prisma`, repo-root `docker-compose.yml` for Postgres, and `npm run dev` listens on port **3001** without errors.

2. **Given** `docker compose up -d` **When** `npx prisma migrate dev` (or `migrate deploy`) runs **Then** migrations apply cleanly and `npx prisma studio` can connect.

3. **Given** any API response **When** inspected **Then** success uses `{ data, meta }` and errors use `{ error, code }` (architecture NFR).

4. **Given** string input to a write endpoint **When** it contains a SQL-injection-like payload **Then** input is validated and persisted via Prisma parameterised queries only (no raw concatenated SQL).

## Tasks / Subtasks

- [x] Root `docker-compose.yml` — Postgres 16, user/db `worldcup2`, port 5432
- [x] `backend/package.json` — Fastify 5, Prisma 6, Zod, CORS, rate-limit, `dev` / `build` / `lint` / `test`
- [x] `backend/prisma/schema.prisma` + initial migration (`leagues` minimal table)
- [x] `backend/src` — config, Prisma singleton, `createApp`, `/api/v1/health`, `/api/v1/leagues` GET+POST
- [x] Envelope helpers + global error handler (`AppError`, `ZodError` → 422)
- [x] `backend/.env.example`, `backend/.gitignore`, repo-root `.gitignore` for backend artifacts
- [x] Tests: health envelope, validation envelope; optional DB test behind `RUN_DB_TESTS=1`

## Dev Notes

- **Docker:** `docker compose up -d` from repo root. If Docker Desktop is not running, start it before `prisma migrate` / `prisma studio`.
- **First-time DB:** `cp backend/.env.example backend/.env` then `cd backend && npx prisma migrate deploy && npm run dev`.
- **Default port:** `API_PORT` defaults to **3001** (override in `.env`).
- **SQL injection AC:** Demonstrated by storing `\' OR 1=1 --` as a literal title via Prisma `create`; run `RUN_DB_TESTS=1 npm test` with Postgres up and migrations applied.

## Dev Agent Record

### Implementation Plan

- Mirror architecture: REST under `/api/v1/`, snake_case DB columns via `@map`, response envelopes on all routes touched in this story.
- Prisma as the only DB access layer for the scaffold (no `$queryRaw` with user input).

### Completion Notes

- `npm run lint`, `npm run build`, and `npm test` pass without a running database (DB-backed test is skipped unless `RUN_DB_TESTS=1`).
- Prisma CLI requires `DATABASE_URL` in the environment (e.g. from `backend/.env`).

## File List

- `docker-compose.yml`
- `.gitignore`
- `backend/package.json`
- `backend/package-lock.json`
- `backend/tsconfig.json`
- `backend/eslint.config.js`
- `backend/.gitignore`
- `backend/.env.example`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/migration_lock.toml`
- `backend/prisma/migrations/20260427203000_init/migration.sql`
- `backend/src/index.ts`
- `backend/src/config.ts`
- `backend/src/db.ts`
- `backend/src/appError.ts`
- `backend/src/createApp.ts`
- `backend/src/lib/envelope.ts`
- `backend/src/routes/v1/index.ts`
- `backend/src/routes/v1/health.ts`
- `backend/src/routes/v1/leagues.ts`
- `backend/test/health.test.ts`
- `backend/test/leagues.validation.test.ts`
- `backend/test/leagues.db.test.ts`

## Change Log

- **2026-04-27:** Story 1.8 — Fastify + Prisma backend scaffold, Docker Postgres, API envelopes, initial `leagues` migration.
