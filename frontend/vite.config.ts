import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";

const leagueAddressPath = /^\/league\/0x[a-fA-F0-9]{40}\/?$/i;
const OG_MARKER = "<!--degendraft-ssr-og-->";

function escapeHtmlAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Same generic OG as backend `GET /league/:invalid` (kept in sync manually). */
function genericOgMetaSnippet(publicOrigin: string): string {
  const origin = publicOrigin.replace(/\/$/, "");
  const title = escapeHtmlAttr("DegenDraft");
  const description = escapeHtmlAttr("Browse on-chain World Cup prediction leagues.");
  const url = escapeHtmlAttr(`${origin}/`);
  const image = escapeHtmlAttr(`${origin}/degendraft-og-card.svg`);
  return [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${title}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${image}" />`,
  ].join("\n    ");
}

function injectOgIntoIndexHtml(html: string, ogSnippet: string): string {
  if (html.includes(OG_MARKER)) {
    return html.replace(OG_MARKER, ogSnippet);
  }
  return html.replace("</head>", `    ${ogSnippet}\n  </head>`);
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "league-og-html-proxy",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.method !== "GET" || !req.url) {
            next();
            return;
          }
          const pathname = req.url.split("?")[0] ?? "";
          if (!leagueAddressPath.test(pathname)) {
            next();
            return;
          }
          const apiOrigin = process.env.VITE_LEAGUE_OG_API_ORIGIN ?? "http://127.0.0.1:3001";
          const publicOrigin = process.env.VITE_PUBLIC_APP_ORIGIN ?? "http://localhost:5173";
          const base = apiOrigin.replace(/\/$/, "");
          const target = `${base}${pathname}`;
          const genericUrl = `${base}/league/not-a-valid-address`;

          const sendHtml = (status: number, body: string, contentType?: string) => {
            res.statusCode = status;
            res.setHeader("content-type", contentType ?? "text/html; charset=utf-8");
            res.end(body);
          };

          let htmlOut: string | null = null;

          try {
            const r = await fetch(target, {
              headers: { accept: "text/html,application/xhtml+xml" },
            });
            const body = await r.text();
            if (r.ok) {
              htmlOut = body;
            } else {
              console.warn("[league-og-html-proxy] API non-OK", r.status, target);
              const r2 = await fetch(genericUrl, {
                headers: { accept: "text/html,application/xhtml+xml" },
              });
              const body2 = await r2.text();
              if (r2.ok) {
                htmlOut = body2;
              } else {
                console.warn("[league-og-html-proxy] generic fallback non-OK", r2.status, genericUrl);
              }
            }
          } catch (err) {
            console.error("[league-og-html-proxy] fetch failed", target, err);
            try {
              const r2 = await fetch(genericUrl, {
                headers: { accept: "text/html,application/xhtml+xml" },
              });
              const body2 = await r2.text();
              if (r2.ok) {
                htmlOut = body2;
              } else {
                console.warn("[league-og-html-proxy] generic retry non-OK", r2.status, genericUrl);
              }
            } catch (err2) {
              console.error("[league-og-html-proxy] generic fetch failed", genericUrl, err2);
            }
          }

          if (htmlOut) {
            sendHtml(200, htmlOut);
            return;
          }

          try {
            const indexPath = path.join(import.meta.dirname, "index.html");
            const template = fs.readFileSync(indexPath, "utf8");
            const snippet = genericOgMetaSnippet(publicOrigin);
            sendHtml(200, injectOgIntoIndexHtml(template, snippet));
          } catch (err) {
            console.error("[league-og-html-proxy] local index.html fallback failed", err);
            sendHtml(
              503,
              "DegenDraft: league preview HTML could not be loaded (API unreachable). Start the backend or set VITE_LEAGUE_OG_API_ORIGIN.",
              "text/plain; charset=utf-8",
            );
          }
        });
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
