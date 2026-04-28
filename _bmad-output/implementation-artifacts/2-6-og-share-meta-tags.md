# Story 2.6: OG share meta tags

Status: done

## Story

As a creator,
I want league share links to render rich Open Graph previews when shared on Discord, Telegram, or X,
So that my league gets maximum visibility from social sharing.

## Acceptance criteria

1. **Given** a league exists at `/league/:address` **When** a link scraper fetches the URL **Then** the response includes `og:title` (league name), `og:description` (entry fee, pool size, chain), `og:image` (platform branded card), and `og:url` with the canonical league URL (FR11).

2. **Given** the page is server-side rendered or uses a meta tag SSR approach **When** a bot fetches the league detail URL **Then** meta tags are present in the initial HTML response — not injected only by client-side JS.

3. **Given** an invalid or non-existent league address is requested **When** the URL is fetched **Then** generic platform OG tags are returned rather than an error page with no meta tags.

## Tasks / subtasks

- [x] Backend: `GET /league/:address` returns `text/html` with SPA shell and injected `og:*` (+ Twitter large card) from indexer row
- [x] Backend: `PUBLIC_APP_ORIGIN` for absolute `og:url` / `og:image`; optional `FRONTEND_INDEX_HTML_PATH`; repo-root discovery for `frontend/index.html` vs `frontend/dist/index.html`
- [x] Frontend: `index.html` SSR marker `<!--degendraft-ssr-og-->`; branded `public/degendraft-og-card.svg`
- [x] Frontend: Vite dev middleware proxies `/league/0x…40` to API (`VITE_LEAGUE_OG_API_ORIGIN`, default `http://127.0.0.1:3001`) so local scrapers see tags in first HTML
- [x] Tests: `leagueOgMeta` unit tests; `leagues.ogHtml` smoke; DB test for known league HTML
- [x] Docs: `.env.example` entries for Story 2.6
- [x] Sprint: `2-6-og-share-meta-tags` → `done`; story Status → `done`

## Dev notes

- Crawlers do not execute client JS; meta tags must appear in the first HTML document. The API serves that document for `/league/:address` by reading the SPA `index.html` template and replacing `<!--degendraft-ssr-og-->` with escaped meta tags.
- **Production hosting:** The same host that serves the SPA must route `GET /league/:address` to the Fastify process (or a reverse proxy must forward that path to it). If the SPA is on static storage only with no path override, configure the CDN / edge to hit the API for `/league/*` HTML.
- Default `og:image` is `${PUBLIC_APP_ORIGIN}/degendraft-og-card.svg` (1200×630 branded shell). Some networks prefer PNG; swap asset later if needed.

### Future / backlog (not implemented)

- **Cache** the SPA `index.html` template in memory after first successful read to reduce disk IO under crawler load.
- **Raster `og:image`** (e.g. 1200×630 PNG) for scrapers that ignore or mishandle SVG.
- **DB:** unique constraint on league `contract_address` (or `(chain_id, contract_address)`) so `findFirst` is never ambiguous when duplicate rows exist.
- **Vite `genericOgMetaSnippet`:** kept in sync manually with backend generic OG for the local `index.html` fallback; consider a tiny shared module if duplication becomes painful.
- **Vite OG proxy:** add a `fetch` timeout (or `AbortSignal.timeout`) so a hung API does not leave the dev middleware pending indefinitely.

## Passive code review #2 (2026-04-27)

**Outcome:** **Approve** — no blockers for marking Story 2.6 **done**.

**Verified against AC:** League HTML includes `og:title`, `og:description`, `og:url`, `og:image` (+ Twitter large card) from server-generated HTML; invalid / missing league returns 200 with generic OG; title/description truncated before escape; Vite proxy fallbacks preserve meta in HTML when the primary API response is non-OK or the first fetch throws (then local inject, then 503).

**Low / informational (deferred):** Generic retry in Vite uses the same copy as backend “invalid address” (`Browse on-chain…`), not the API’s “League not found…” branch — only matters on odd failure modes. `canonicalUrl` / `imageUrl` lengths assume sane `PUBLIC_APP_ORIGIN`. `injectOgIntoIndexHtml` replaces the first `</head>` only if the marker is absent (unlikely given templates).

## Dev agent record

### Completion notes

- Implemented `leagueOgHtmlPlugin` on Fastify root `GET /league/:address` with Prisma-backed copy and HTML escaping.
- Added `leagueOgMeta` helpers for description formatting and injection.
- Vite `league-og-html-proxy` plugin fetches SSR HTML from the API in dev so `localhost:5173/league/0x…` matches production behavior for bots.
- **Code review follow-up:** `og:title` / `og:description` truncated (70 / 200 grapheme units) before HTML escape. Vite proxy: on API non-OK or network error, retry generic HTML from API, then inject generic OG into local `index.html`, else 503 plain text.

### Debug log

- (empty)

## File list

- `backend/src/config.ts`
- `backend/src/createApp.ts`
- `backend/src/lib/leagueOgMeta.ts`
- `backend/src/routes/leagueOgHtml.ts`
- `backend/test/leagueOgMeta.unit.test.ts`
- `backend/test/leagues.ogHtml.test.ts`
- `backend/test/leagues.ogHtml.db.test.ts`
- `backend/.env.example`
- `frontend/index.html`
- `frontend/public/degendraft-og-card.svg`
- `frontend/vite.config.ts`
- `frontend/.env.example`

## Change log

- **2026-04-27:** Story 2.6 implemented; ready for review.
- **2026-04-27:** Code review — OG field truncation; Vite league OG proxy fallbacks + logging; future items listed under Dev notes.
- **2026-04-27:** Passive code review #2 — Approve; see section above. Fetch timeout added to Future / backlog.
- **2026-04-27:** Story marked **done** after passive review #2.
