import type { League } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export type BrowseLeaguePublic = {
  id: string;
  contractAddress: string | null;
  chainId: number;
  title: string;
  entryTokenSymbol: string;
  entryTokenAddress: string;
  entryFeeWei: string;
  poolWei: string;
  entryCount: number;
  maxEntries: number;
  lockAt: string;
  featured: boolean;
  promotedUntil: string | null;
  createdAt: string;
};

export function isSpotlightLeague(l: { featured: boolean; promotedUntil: Date | null }): boolean {
  const now = Date.now();
  return l.featured || (l.promotedUntil != null && l.promotedUntil.getTime() > now);
}

export function toBrowseLeaguePublic(l: League): BrowseLeaguePublic {
  return {
    id: l.id,
    contractAddress: l.contractAddress,
    chainId: l.chainId,
    title: l.title,
    entryTokenSymbol: l.entryTokenSymbol,
    entryTokenAddress: l.entryTokenAddress,
    entryFeeWei: l.entryFeeWei.toString(),
    poolWei: l.poolWei.toString(),
    entryCount: l.entryCount,
    maxEntries: l.maxEntries,
    lockAt: l.lockAt.toISOString(),
    featured: l.featured,
    promotedUntil: l.promotedUntil?.toISOString() ?? null,
    createdAt: l.createdAt.toISOString(),
  };
}

export function sortSpotlight(rows: League[]): League[] {
  return [...rows].sort((a, b) => {
    const pa = a.promotedUntil?.getTime() ?? 0;
    const pb = b.promotedUntil?.getTime() ?? 0;
    if (pa !== pb) return pb - pa;
    if (a.featured !== b.featured) return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

export type BrowseSortKey = "createdAt" | "poolWei" | "entryCount";

export function sortMain(rows: League[], sort: BrowseSortKey, order: "asc" | "desc"): League[] {
  const dir = order === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    if (sort === "createdAt") cmp = a.createdAt.getTime() - b.createdAt.getTime();
    else if (sort === "poolWei") cmp = (a.poolWei < b.poolWei ? -1 : a.poolWei > b.poolWei ? 1 : 0);
    else cmp = a.entryCount - b.entryCount;
    return cmp * dir;
  });
}

export function partitionBrowseRows(
  all: League[],
  sort: BrowseSortKey,
  order: "asc" | "desc",
): { featured: League[]; leagues: League[] } {
  const spotlight: League[] = [];
  const rest: League[] = [];
  for (const row of all) {
    if (isSpotlightLeague(row)) spotlight.push(row);
    else rest.push(row);
  }
  return {
    featured: sortSpotlight(spotlight),
    leagues: sortMain(rest, sort, order),
  };
}

export function buildLeagueBrowseWhere(input: {
  chainId?: number;
  entryToken?: string;
}): Prisma.LeagueWhereInput {
  const andParts: Prisma.LeagueWhereInput[] = [];
  if (input.chainId !== undefined) andParts.push({ chainId: input.chainId });
  if (input.entryToken) {
    const t = input.entryToken.trim();
    if (t.length > 0) {
      if (t.startsWith("0x")) {
        andParts.push({ entryTokenAddress: { equals: t, mode: "insensitive" } });
      } else {
        andParts.push({ entryTokenSymbol: { contains: t, mode: "insensitive" } });
      }
    }
  }
  if (andParts.length === 0) return {};
  return { AND: andParts };
}
