import type { FastifyPluginAsync } from "fastify";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";
import { prisma } from "../db.js";
import {
  buildLeagueOgDescription,
  buildOgMetaSnippet,
  checksummedLeaguePathAddress,
  injectOgIntoIndexHtml,
} from "../lib/leagueOgMeta.js";

/** Walk up from cwd until `frontend/index.html` exists (works for `backend/` or repo root). */
function findRepoRootSoft(): string | null {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    if (existsSync(path.join(dir, "frontend", "index.html"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function defaultOgImageUrl(): string {
  const base = config.publicAppOrigin.replace(/\/$/, "");
  return `${base}/degendraft-og-card.svg`;
}

const FALLBACK_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DegenDraft</title>
    <!--degendraft-ssr-og-->
  </head>
  <body>
    <div id="root"></div>
    <p>DegenDraft</p>
  </body>
</html>
`;

async function loadIndexTemplate(): Promise<string> {
  if (process.env.FRONTEND_INDEX_HTML_PATH?.trim()) {
    const explicit = path.resolve(process.cwd(), process.env.FRONTEND_INDEX_HTML_PATH.trim());
    try {
      return await fs.readFile(explicit, "utf8");
    } catch {
      return FALLBACK_HTML;
    }
  }
  const root = findRepoRootSoft();
  const useDist = process.env.NODE_ENV === "production";
  const rel = useDist ? (["frontend", "dist", "index.html"] as const) : (["frontend", "index.html"] as const);
  const p = root ? path.join(root, ...rel) : null;
  if (p) {
    try {
      return await fs.readFile(p, "utf8");
    } catch {
      return FALLBACK_HTML;
    }
  }
  return FALLBACK_HTML;
}

export const leagueOgHtmlPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Params: { address: string } }>("/league/:address", async (request, reply) => {
    const raw = (request.params as { address?: string }).address ?? "";
    const checksummed = checksummedLeaguePathAddress(raw);
    const origin = config.publicAppOrigin.replace(/\/$/, "");
    const imageUrl = defaultOgImageUrl();

    const template = await loadIndexTemplate();

    if (!checksummed) {
      const canonicalUrl = `${origin}/`;
      const snippet = buildOgMetaSnippet({
        title: "DegenDraft",
        description: "Browse on-chain World Cup prediction leagues.",
        canonicalUrl,
        imageUrl,
      });
      reply.type("text/html; charset=utf-8");
      return injectOgIntoIndexHtml(template, snippet);
    }

    const canonicalUrl = `${origin}/league/${checksummed}`;
    const row = await prisma.league.findFirst({
      where: { contractAddress: { equals: checksummed, mode: "insensitive" } },
    });

    if (!row) {
      const snippet = buildOgMetaSnippet({
        title: "DegenDraft",
        description: "League not found. Browse live leagues on DegenDraft.",
        canonicalUrl,
        imageUrl,
      });
      reply.type("text/html; charset=utf-8");
      return injectOgIntoIndexHtml(template, snippet);
    }

    const snippet = buildOgMetaSnippet({
      title: row.title,
      description: buildLeagueOgDescription(row),
      canonicalUrl,
      imageUrl,
    });
    reply.type("text/html; charset=utf-8");
    return injectOgIntoIndexHtml(template, snippet);
  });
};
