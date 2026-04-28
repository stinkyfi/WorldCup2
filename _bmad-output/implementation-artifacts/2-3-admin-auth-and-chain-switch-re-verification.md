# Story 2.3: Admin auth & chain switch re-verification

Status: done

## Summary

- Postgres **`admins`** table: unique `(address, chain_id)` whitelist.
- **`AuthSession.isAdmin`**: set on SIWE verify from whitelist for signed chain; updated on **`POST /api/v1/auth/session-chain`** when the wallet chain changes (FR5).
- **`GET /api/v1/auth/me`**: returns `{ address, chainId, isAdmin }`.
- **`GET /api/v1/admin/health`**: example admin-only API (403 without admin session).
- **Frontend**: `SessionChainSync` posts session-chain on `useChainId` change; **`RequireAdmin`** gates `/admin/*` with redirect to `/?notice=admin_denied`; **Admin** nav link when `me.isAdmin`; landing page shows access-denied copy.

## Bootstrap an admin

After migrate, insert a row (checksummed address), e.g. Base Sepolia `84532`:

```sql
INSERT INTO admins (id, address, chain_id, created_at)
VALUES ('bootstrap-1', '0xYourChecksummedAddress', 84532, NOW());
```

Or use Prisma Studio. Add extra chain IDs to `SIWE_ALLOWED_CHAIN_IDS` if you need session-chain beyond Base Sepolia.

## File list

- `backend/prisma/schema.prisma`, migration `20260429140000_admin_whitelist_session_is_admin`
- `backend/src/lib/adminWhitelist.ts`
- `backend/src/routes/v1/auth.ts` — `isAdmin`, `POST /auth/session-chain`
- `backend/src/routes/v1/admin.ts`, `routes/v1/index.ts`
- `backend/src/config.ts` — getters for SIWE allowlists (tests can override env)
- `backend/test/auth.routes.test.ts` — `beforeEach` admin purge; admin + session-chain tests
- `frontend/src/lib/siweAuthContext.tsx` — `SessionUser`, `me`, `refreshSession`
- `frontend/src/components/SiweAuthProviders.tsx`, `SessionChainSync.tsx`, `RequireAdmin.tsx`
- `frontend/src/pages/AdminPlaceholderPage.tsx`, `LandingPage.tsx` (notice)
- `frontend/src/AppRoutes.tsx`, `AppShell.tsx`
- `backend/.env.example`

## Change log

- **2026-04-29:** Implemented Story 2.3.
