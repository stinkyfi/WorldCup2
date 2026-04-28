import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildLeagueOgDescription,
  buildOgMetaSnippet,
  checksummedLeaguePathAddress,
  injectOgIntoIndexHtml,
  formatTokenWeiHuman,
  OG_DESCRIPTION_MAX_LEN,
  OG_TITLE_MAX_LEN,
} from "../src/lib/leagueOgMeta.js";
import type { League } from "@prisma/client";

function mockLeague(partial: Partial<Pick<League, "chainId" | "title" | "entryTokenSymbol" | "entryTokenDecimals" | "entryFeeWei" | "poolWei">>): League {
  return {
    id: "x",
    chainId: 84532,
    title: "Test League",
    contractAddress: "0x1111111111111111111111111111111111111111",
    creatorAddress: "0x2222222222222222222222222222222222222222",
    creatorDescription: null,
    revisionPolicy: "Free",
    entryTokenSymbol: "USDC",
    entryTokenDecimals: 6,
    entryTokenAddress: "0x3333333333333333333333333333333333333333",
    entryFeeWei: 1_500_000n,
    poolWei: 7_500_000n,
    entryCount: 1,
    maxEntries: 10,
    lockAt: new Date(),
    devFeeBps: 0,
    creatorFeeBps: 0,
    featured: false,
    promotedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...partial,
  } as League;
}

test("formatTokenWeiHuman trims trailing fractional zeros", () => {
  assert.equal(formatTokenWeiHuman(1_000_000n, 6, "USDC"), "1 USDC");
  assert.equal(formatTokenWeiHuman(1_500_000n, 6, "USDC"), "1.5 USDC");
});

test("buildLeagueOgDescription includes entry, pool, chain", () => {
  const d = buildLeagueOgDescription(mockLeague({}));
  assert.match(d, /Entry/);
  assert.match(d, /Pool/);
  assert.match(d, /Base Sepolia/);
});

test("buildOgMetaSnippet escapes HTML in title and description", () => {
  const s = buildOgMetaSnippet({
    title: 'A & B <script>',
    description: 'Quote "test"',
    canonicalUrl: "https://example.com/league/0x1",
    imageUrl: "https://example.com/i.png",
  });
  assert.ok(s.includes("&amp;"));
  assert.ok(s.includes("&lt;"));
  assert.ok(s.includes("&quot;"));
  assert.ok(s.includes('property="og:title"'));
  assert.ok(s.includes('property="og:image"'));
});

test("buildOgMetaSnippet truncates long title and description before escape", () => {
  const longTitle = "T".repeat(OG_TITLE_MAX_LEN + 40);
  const longDesc = "D".repeat(OG_DESCRIPTION_MAX_LEN + 50);
  const s = buildOgMetaSnippet({
    title: longTitle,
    description: longDesc,
    canonicalUrl: "https://example.com/league/0x1",
    imageUrl: "https://example.com/i.png",
  });
  const titleM = s.match(/property="og:title" content="([^"]*)"/);
  const descM = s.match(/property="og:description" content="([^"]*)"/);
  assert.ok(titleM);
  assert.ok(descM);
  assert.equal([...titleM[1]].length, OG_TITLE_MAX_LEN);
  assert.ok(titleM[1].endsWith("\u2026"));
  assert.equal([...descM[1]].length, OG_DESCRIPTION_MAX_LEN);
  assert.ok(descM[1].endsWith("\u2026"));
});

test("injectOgIntoIndexHtml replaces marker when present", () => {
  const html = "<head>\n    <!--worldcup2-ssr-og-->\n  </head>";
  const out = injectOgIntoIndexHtml(html, '<meta property="og:title" content="Hi" />');
  assert.ok(out.includes('property="og:title"'));
  assert.ok(!out.includes("<!--worldcup2-ssr-og-->"));
});

test("checksummedLeaguePathAddress returns null for bad input", () => {
  assert.equal(checksummedLeaguePathAddress("nothex"), null);
  assert.equal(checksummedLeaguePathAddress("0x123"), null);
});

test("checksummedLeaguePathAddress returns checksummed address", () => {
  const a = checksummedLeaguePathAddress("0x1111111111111111111111111111111111111111");
  assert.ok(a?.startsWith("0x"));
  assert.equal(a?.length, 42);
});
