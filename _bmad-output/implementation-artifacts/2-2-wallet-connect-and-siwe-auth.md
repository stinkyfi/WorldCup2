# Story 2.2: Wallet connect & SIWE auth

Status: done

## Story

As a player or creator,
I want to connect my EVM wallet via RainbowKit and authenticate with Sign-In-with-Ethereum,
So that I can access gated actions (entering leagues, creating leagues) with a trustless, non-custodial login.

## Acceptance Criteria

1. **Given** a visitor opens the RainbowKit connect modal **When** it renders **Then** **MetaMask**, **Rainbow**, **Coinbase Wallet**, and **WalletConnect** appear as connector options (FR1).

2. **Given** a user connects a wallet **When** SIWE runs **Then** a **sign message** prompt appears; after a valid signature, the backend sets an **HTTP-only session cookie** and the app treats the user as **authenticated**.

3. **Given** an authenticated user **When** display name is resolved **Then** show **ENS** (Ethereum), **Basename** (Base), or **SNS** (Sonic) name + avatar when available, else **truncated address** (FR3).

4. **Given** an authenticated user **When** they open **My Leagues** or **Create** **Then** they are **not** blocked by SIWE again until session expires or they disconnect.

5. **Given** the user disconnects the wallet **When** disconnect completes **Then** the **session cookie** is cleared and gated UX returns to **visitor** state.

6. **Given** the user **rejects** the SIWE signature **When** RainbowKit reports failure **Then** the wallet stays **connected** but **not** authenticated; show a **plain-English inline** message that they must sign to continue (UX-DR13).

## Scope boundaries

- **In scope:** SIWE issuance/verification, session transport, RainbowKit auth adapter wiring, basic identity display on nav (or adjacent to `ConnectButton`), gating **Create** / **My Leagues** routes (redirect or inline prompt — pick one pattern and document).
- **Story 2.3:** Admin whitelist + `/admin/*` — **out of scope** here.
- **Story 2.4+:** Browse list data — browse page remains public; auth only for creator/player flows as specified above.

## Technical guidance

_(Original planning notes retained for context; implementation matches `/api/v1/auth/*` + `wc_session` cookie + explicit FR1 wallet group.)_

## Tasks / Subtasks (for implementer)

- [x] Backend: Prisma models `AuthNonce` (and session storage shape) + migration
- [x] Backend: `POST /api/v1/auth/nonce`, `POST /api/v1/auth/verify`, `POST /api/v1/auth/logout` (or clear-session route)
- [x] Backend: cookie + CORS credentials; env `CORS_ORIGIN`, `SESSION_SECRET` (or equivalent)
- [x] Frontend: RainbowKit `authenticationAdapter` + `RainbowKitAuthenticationProvider`
- [x] Frontend: `IdentityDisplay` (or extend header) for ENS/address fallback
- [x] Frontend: gate `/create` and `/my-leagues`; disconnect clears session client-side + call logout
- [x] Tests: backend verify unit/integration; frontend auth state tests where feasible

## References

- **FR1, FR3, UX-DR13** — `planning-artifacts/epics.md` (Story 2.2)
- **Auth architecture** — `planning-artifacts/architecture.md` (SIWE, cookie, `auth.ts` routes)
- **RainbowKit:** `AuthenticationContext`, `createAuthenticationAdapter`

## Dev Agent Record

### Completion notes

- **FR3 partial:** `IdentityDisplay` resolves **Ethereum mainnet ENS** name + avatar via viem public client; **Basename** and **SNS** are not yet wired (extend with chain-specific resolvers when ready).
- **RainbowKit 2.2.10:** `useAuthenticationStatus` is not re-exported from the main package; app uses **`useSiweSession()`** mirroring the same status passed into `RainbowKitAuthenticationProvider`.
- **Deploy:** run `npx prisma migrate deploy` (or `db:migrate`) so `auth_nonces` / `auth_sessions` exist. Set `CORS_ORIGIN` and `SIWE_ALLOWED_DOMAINS` to match the SPA origin/host. Use `COOKIE_SECURE=true` in production.
- **Backend tests:** `auth.routes.test.ts` uses the same `DATABASE_URL` gate as stats; `/auth/me` with no cookie does not touch the DB.

### Debug log

- Fixed `AppError` argument order (`message`, `code`, `statusCode`).
- Frontend Vitest: `refreshSession` catches failed `fetch` so tests without a running API do not surface unhandled rejections.

## File List

- `backend/package.json` — deps: `siwe`, `@fastify/cookie`, `viem`
- `backend/prisma/schema.prisma` — `AuthNonce`, `AuthSession`
- `backend/prisma/migrations/20260428120000_auth_nonces_sessions/migration.sql`
- `backend/src/config.ts` — SIWE / CORS / session / cookie options
- `backend/src/createApp.ts` — cookie + credentialed CORS
- `backend/src/routes/v1/auth.ts` — nonce, verify, me, logout
- `backend/src/routes/v1/index.ts` — register auth routes
- `backend/test/auth.routes.test.ts`
- `backend/.env.example`
- `frontend/package.json` — dep: `siwe`
- `frontend/.env.example`
- `frontend/src/wagmi.ts` — FR1 wallet group
- `frontend/src/Providers.tsx` — delegates to `SiweAuthProviders`
- `frontend/src/lib/siweAuthContext.tsx` — session + SIWE UI context hooks
- `frontend/src/components/SiweAuthProviders.tsx` — SIWE adapter + RainbowKit auth wiring
- `frontend/src/components/RequireSiwe.tsx` — gated routes
- `frontend/src/components/IdentityDisplay.tsx`
- `frontend/src/components/AppShell.tsx` — identity + SIWE error banner
- `frontend/src/AppRoutes.tsx` — wrap `/create`, `/my-leagues`
- `frontend/src/pages/CreatePlaceholderPage.tsx`, `MyLeaguesPlaceholderPage.tsx`

## Change Log

- **2026-04-28:** Story promoted to `ready-for-dev` — sprint advanced to Epic 2 Story 2.2.
- **2026-04-28:** Implementation complete — status `done`; SIWE + session cookie + gated routes + tests.
