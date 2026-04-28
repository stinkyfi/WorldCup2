import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { chainLabel, type BrowseLeague } from "@/lib/leagueBrowse";
import { formatTimeToLock, formatTokenWei } from "@/lib/leagueDisplay";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export type LeagueCardProps = {
  league: BrowseLeague;
  /** When true, slightly emphasized border (featured row). */
  spotlight?: boolean;
};

export function LeagueCard({ league, spotlight }: LeagueCardProps) {
  const clickable = Boolean(league.contractAddress);
  const card = (
    <Card
      className={cn(
        "flex h-full flex-col transition-shadow",
        spotlight ? "border-primary/50 shadow-md" : clickable ? "hover:border-border/80 hover:shadow-sm" : "",
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2 text-lg leading-snug">{league.title}</CardTitle>
          {spotlight ? (
            <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
              Featured
            </span>
          ) : null}
        </div>
        <CardDescription className="font-mono text-xs">{chainLabel(league.chainId)}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto flex flex-col gap-2 text-sm">
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-muted-foreground">
          <dt>Entry token</dt>
          <dd className="text-right font-medium text-foreground">{league.entryTokenSymbol}</dd>
          <dt>Entry fee</dt>
          <dd className="text-right font-medium text-foreground">
            {formatTokenWei(league.entryFeeWei, league.entryTokenSymbol)}
          </dd>
          <dt>Pool</dt>
          <dd className="text-right font-medium text-foreground">
            {formatTokenWei(league.poolWei, league.entryTokenSymbol)}
          </dd>
          <dt>Entries</dt>
          <dd className="text-right font-medium text-foreground">
            {league.entryCount} / {league.maxEntries}
          </dd>
          <dt>Lock</dt>
          <dd className="text-right font-medium text-foreground">{formatTimeToLock(league.lockAt)}</dd>
        </dl>
      </CardContent>
      </Card>
  );

  if (clickable) {
    return (
      <Link
        to={`/league/${league.contractAddress}`}
        className={cn("block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring")}
        aria-label={`Open league ${league.title}`}
      >
        {card}
      </Link>
    );
  }
  return <div className="block h-full">{card}</div>;
}
