import { Link } from "react-router-dom";
import { Coins, Trophy, Users } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DragDemoGroup } from "@/components/DragDemoGroup";
import { MarketIntelPanel } from "@/components/MarketIntelPanel";
import { cn } from "@/lib/utils";

function StepCard(props: { icon: ReactNode; title: string; body: string }) {
  const { icon, title, body } = props;
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4 shadow-[0_0_28px_-18px_rgba(10,238,235,0.25)]">
      <div className="flex items-start gap-3">
        <div className="inline-flex size-10 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent">
          {icon}
        </div>
        <div>
          <p className="font-display text-base font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{body}</p>
        </div>
      </div>
    </div>
  );
}

export function HowItWorksSection(props: { className?: string }) {
  const { className } = props;
  return (
    <section className={cn("mx-auto w-full max-w-7xl px-4 py-10 sm:px-6", className)} aria-labelledby="how-it-works">
      <div className="mb-6 flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent/95">How it works</p>
        <h2 id="how-it-works" className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          A prediction game that feels like a draft
        </h2>
        <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
          Rank teams inside each group (1–4). When results post, your picks score points. Enter leagues on-chain when you’re
          ready.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid gap-4">
          <StepCard
            icon={<Users className="size-5" />}
            title="Pick a league"
            body="Browse public leagues or join a friend’s. Each league has an entry fee + lock time."
          />
          <StepCard
            icon={<Trophy className="size-5" />}
            title="Rank every group"
            body="Drag teams to set positions 1–4. Perfect groups earn a bonus point."
          />
          <StepCard
            icon={<Coins className="size-5" />}
            title="Enter on-chain"
            body="Submit your commitment and compete. Scores update as the oracle posts results."
          />

          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild className="min-h-11">
              <Link to="/browse">Browse leagues</Link>
            </Button>
            <Button asChild variant="secondary" className="min-h-11">
              <Link to="/create">Create a league</Link>
            </Button>
          </div>
        </div>

        <DragDemoGroup />

        <MarketIntelPanel />
      </div>
    </section>
  );
}

