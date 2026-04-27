# Story 1.9: Frontend repo — init & design system

Status: done

## Story

As a developer,
I want a Vite + React + TypeScript frontend bootstrapped via `npm create rainbowkit@latest` with Tailwind CSS, shadcn/ui, and the Broadcast design tokens configured,
So that all UI development starts from the correct design foundation with working wallet connection out of the box.

## Acceptance Criteria

1. **Given** no `frontend/` directory **When** the project is initialised **Then** `frontend/` exists with Vite + React + TypeScript, Tailwind (Broadcast tokens), Radix-based UI primitives equivalent to shadcn `button` / `card` / `input`, RainbowKit + wagmi + viem, **Base Sepolia** as the configured testnet, and `npm run dev` serves on port **5173** with a working connect flow.

2. **Given** the app loads **When** the shell is inspected **Then** `<AppShell>` shows logo left, primary nav centre (Browse / My Leagues / Create), chain control + wallet connect right (UX-DR12).

3. **Given** viewport &lt; 1024px **When** the header is inspected **Then** primary links move into a hamburger (Radix Dialog) and tap targets for menu controls use **≥ 44×44px** (`min-h-11` / `min-w-11` on `Button` + mobile links) (UX-DR11).

4. **Given** design tokens **When** `Button`, `Card`, and `Input` are used **Then** they use Broadcast navy / primary palette suitable for WCAG-oriented dark UI (primary on navy meets common AA pairings for headings and controls).

## Tasks / Subtasks

- [x] `npm create vite@latest frontend -- --template react-ts` + RainbowKit/wagmi/viem/React Query/zustand
- [x] Tailwind v4 (`@tailwindcss/vite`) + `@theme` tokens (`#0A0E1A`, `#131929`, `#3B82F6`) + Inter / JetBrains Mono (Google Fonts)
- [x] `components.json` for future `shadcn add` workflows; manual `src/components/ui/*` aligned with shadcn patterns (Radix Slot + CVA)
- [x] `AppShell` + mobile drawer (`useNavDrawer` zustand store)
- [x] `Providers` (Wagmi + Query + RainbowKit `darkTheme` accent `#3b82f6`)
- [x] Vitest + Testing Library smoke tests for `AppShell`
- [x] `frontend/.env.example`, root `.gitignore` entries for `frontend/`

## Dev Notes

- **RainbowKit scaffold:** `npm create rainbowkit@latest` and `npx shadcn@latest init --template vite` both stalled on interactive prompts in this environment, so the story used **`npm create vite@latest`** and **manual wiring** to match the epic stack (RainbowKit + wagmi + viem + Tailwind + Radix + shadcn-equivalent components). `components.json` is present so you can run `npx shadcn@latest add …` later without re-init.
- **WalletConnect:** Set `VITE_WALLETCONNECT_PROJECT_ID` in `frontend/.env` from [WalletConnect Cloud](https://cloud.walletconnect.com/) for production-quality mobile pairing. A dev fallback is used when unset (see `src/wagmi.ts`).
- **Teardown noise:** Vitest may log `AbortError` from WalletConnect/happy-dom on shutdown; tests still exit 0.

## Dev Agent Record

### Implementation Plan

- Single-chain MVP config: `baseSepolia` only in `getDefaultConfig`.
- Architecture extras: `@tanstack/react-query`, `zustand` (nav drawer), `lucide-react` icons.

### Completion Notes

- `npm run build`, `npm run lint`, and `npm test` succeed in `frontend/`.

## File List

- `frontend/package.json`, `frontend/package-lock.json`
- `frontend/vite.config.ts`, `frontend/tsconfig.app.json`, `frontend/index.html`
- `frontend/components.json`, `frontend/.env.example`, `frontend/.gitignore`
- `frontend/src/index.css`, `frontend/src/main.tsx`, `frontend/src/App.tsx`
- `frontend/src/wagmi.ts`, `frontend/src/Providers.tsx`
- `frontend/src/lib/utils.ts`, `frontend/src/vite-env.d.ts`
- `frontend/src/components/AppShell.tsx`
- `frontend/src/components/ui/button.tsx`, `card.tsx`, `input.tsx`
- `frontend/src/stores/navDrawerStore.ts`
- `frontend/src/test/setup.ts`, `frontend/src/AppShell.test.tsx`
- `.gitignore` (repo root — `frontend/` entries)

## Change Log

- **2026-04-27:** Story 1.9 — Vite React TS frontend, Tailwind Broadcast tokens, RainbowKit (Base Sepolia), AppShell + mobile nav, shadcn-style UI primitives, Vitest.
