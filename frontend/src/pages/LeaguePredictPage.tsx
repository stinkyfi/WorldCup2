import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getAddress } from "viem";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PolymarketOddsWidget } from "@/components/PolymarketOddsWidget";
import { PredictionProgressBar } from "@/components/PredictionProgressBar";
import {
  createEntryId,
  migrateLegacyV1IfPresent,
  savePredictionToStorage,
  type PredictionPayloadV2,
} from "@/lib/predictionCommitment";
import { WORLD_CUP_GROUPS, type WorldCupGroupId } from "@/lib/worldCupGroups";
import { cn } from "@/lib/utils";

function isAddress(s: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(s);
}

type GroupOrderState = Record<WorldCupGroupId, string[]>;

function initState(): GroupOrderState {
  return WORLD_CUP_GROUPS.reduce((acc, g) => {
    acc[g.id] = g.teams.map((t) => t.id);
    return acc;
  }, {} as GroupOrderState);
}

function SortableTeamRow({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex min-h-11 items-center justify-between rounded-md border border-border bg-background/40 px-3 py-2 text-sm",
        isDragging ? "opacity-70" : "",
      )}
      {...attributes}
      {...listeners}
    >
      <span className="font-medium text-foreground">{label}</span>
      <span className="text-xs text-muted-foreground">Drag</span>
    </div>
  );
}

export function LeaguePredictPage() {
  const { address = "" } = useParams();
  const [search] = useSearchParams();
  const entryIdFromUrl = search.get("entryId");
  const isValidAddress = useMemo(() => isAddress(address), [address]);
  const { address: walletAddress } = useAccount();

  const [orderByGroup, setOrderByGroup] = useState<GroupOrderState>(() => initState());
  const [tiebreaker, setTiebreaker] = useState<string>("");
  const [mobileStep, setMobileStep] = useState<number>(0);
  const [confirmedGroups, setConfirmedGroups] = useState<Set<WorldCupGroupId>>(() => new Set());
  const [submitCommitment, setSubmitCommitment] = useState<`0x${string}` | null>(null);
  const [entryId] = useState<string>(() => entryIdFromUrl ?? createEntryId());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const completedGroups = confirmedGroups.size;
  const tiebreakerFilled = /^\d+$/.test(tiebreaker.trim()) && Number(tiebreaker.trim()) >= 1 && Number(tiebreaker.trim()) <= 1000;
  const canSubmit = completedGroups === 12 && tiebreakerFilled;

  const mobileGroup = WORLD_CUP_GROUPS[Math.min(WORLD_CUP_GROUPS.length - 1, Math.max(0, mobileStep))]!;
  const mobileOrder = orderByGroup[mobileGroup.id];
  const teamById = useMemo(() => new Map(mobileGroup.teams.map((t) => [t.id, t.name] as const)), [mobileGroup.teams]);

  function setMobilePick(pos: 0 | 1 | 2 | 3, teamId: string) {
    setOrderByGroup((prev) => {
      const current = prev[mobileGroup.id];
      const next = [...current];
      // Keep choices unique by swapping if needed.
      const otherIdx = next.indexOf(teamId);
      if (otherIdx !== -1) {
        const tmp = next[pos];
        next[pos] = teamId;
        next[otherIdx] = tmp;
      } else {
        next[pos] = teamId;
      }
      return { ...prev, [mobileGroup.id]: next };
    });
    setConfirmedGroups((prev) => new Set(prev).add(mobileGroup.id));
  }

  if (!isValidAddress) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="mb-3 text-2xl font-semibold">Make predictions</h1>
        <p className="mb-8 text-muted-foreground">Invalid league address.</p>
        <Button type="button" variant="secondary" asChild className="min-h-11">
          <Link to="/browse">Browse leagues</Link>
        </Button>
      </div>
    );
  }

  function onSubmit() {
    if (!canSubmit) return;
    if (!walletAddress) return;
    const leagueAddress = getAddress(address) as `0x${string}`;
    const goals = Number(tiebreaker.trim());
    const groups = WORLD_CUP_GROUPS.reduce((acc, g) => {
      const order = orderByGroup[g.id];
      acc[g.id] = [order[0]!, order[1]!, order[2]!, order[3]!] as [string, string, string, string];
      return acc;
    }, {} as PredictionPayloadV2["groups"]);
    const payload: PredictionPayloadV2 = {
      version: 2,
      leagueAddress,
      entryId,
      walletAddress,
      groups,
      tiebreakerTotalGoals: goals,
    };
    migrateLegacyV1IfPresent(leagueAddress, walletAddress);
    const commitment = savePredictionToStorage(payload);
    setSubmitCommitment(commitment);
  }

  return (
    <div>
      <PredictionProgressBar completedGroups={completedGroups} totalGroups={12} tiebreakerFilled={tiebreakerFilled} />

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Predictions</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Desktop drag-and-drop on large screens; mobile uses paginated selectors.
            </p>
          </div>
          <Button type="button" variant="secondary" asChild className="min-h-11">
            <Link to={`/league/${address}`}>Back to league</Link>
          </Button>
        </div>

        <div className="mb-6 hidden rounded-lg border border-border bg-card/40 p-4 text-sm text-muted-foreground lg:block">
          Drag teams within each group to set positions 1–4.
        </div>
        <div className="mb-6 rounded-lg border border-border bg-card/40 p-4 text-sm text-muted-foreground lg:hidden">
          Mobile: set positions using dropdowns. Swipe/paginate through groups A–L.
        </div>

        <PolymarketOddsWidget className="mb-6" />

        {/* Mobile paginated selectors */}
        <div className="lg:hidden">
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {mobileGroup.label} <span className="text-sm text-muted-foreground">({mobileStep + 1} / 12)</span>
              </CardTitle>
              <CardDescription>Select positions 1–4</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[0, 1, 2, 3].map((pos) => (
                <div key={pos} className="grid gap-2">
                  <label className="text-sm font-medium text-foreground" htmlFor={`pos-${pos}`}>
                    Position {pos + 1}
                  </label>
                  <select
                    id={`pos-${pos}`}
                    className="min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    value={mobileOrder[pos] ?? ""}
                    onChange={(e) => setMobilePick(pos as 0 | 1 | 2 | 3, e.target.value)}
                  >
                    {mobileGroup.teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {teamById.get(t.id) ?? t.id}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-11"
                  onClick={() => setMobileStep((s) => Math.max(0, s - 1))}
                  disabled={mobileStep === 0}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  className="min-h-11"
                  onClick={() => setMobileStep((s) => Math.min(11, s + 1))}
                  disabled={mobileStep === 11}
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Desktop drag-and-drop */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={({ active, over }) => {
            if (!over) return;
            const activeId = String(active.id);
            const overId = String(over.id);
            if (activeId === overId) return;
            const group = WORLD_CUP_GROUPS.find((g) => orderByGroup[g.id].includes(activeId));
            if (!group) return;
            const ids = orderByGroup[group.id];
            const oldIndex = ids.indexOf(activeId);
            const newIndex = ids.indexOf(overId);
            if (oldIndex === -1 || newIndex === -1) return;
            setOrderByGroup((prev) => ({ ...prev, [group.id]: arrayMove(prev[group.id], oldIndex, newIndex) }));
            setConfirmedGroups((prev) => new Set(prev).add(group.id));
          }}
        >
          <div className="hidden gap-4 lg:grid lg:grid-cols-2">
            {WORLD_CUP_GROUPS.map((g) => {
              const order = orderByGroup[g.id];
              const teamById = new Map(g.teams.map((t) => [t.id, t.name] as const));
              return (
                <Card key={g.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{g.label}</CardTitle>
                    <CardDescription>Positions 1–4</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <SortableContext items={order} strategy={verticalListSortingStrategy}>
                      {order.map((id, idx) => (
                        <div key={id} className="flex items-center gap-2">
                          <span className="w-6 text-xs font-mono text-muted-foreground">{idx + 1}</span>
                          <div className="flex-1">
                            <SortableTeamRow id={id} label={teamById.get(id) ?? id} />
                          </div>
                        </div>
                      ))}
                    </SortableContext>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DndContext>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Tiebreaker</CardTitle>
            <CardDescription>Predict total goals across all group stage matches (1–1000).</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="min-w-[16rem]">
              <label className="text-sm font-medium text-foreground" htmlFor="tiebreaker">
                Total goals
              </label>
              <input
                id="tiebreaker"
                value={tiebreaker}
                onChange={(e) => setTiebreaker(e.target.value)}
                inputMode="numeric"
                className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="e.g. 142"
              />
            </div>
            <Button type="button" className="min-h-11" disabled={!canSubmit} onClick={() => onSubmit()}>
              {canSubmit ? "Submit predictions" : "Complete all groups + tiebreaker"}
            </Button>
          </CardContent>
        </Card>

        {submitCommitment ? (
          <div className="mt-6 rounded-lg border border-primary/40 bg-primary/5 p-4 text-sm">
            <p className="font-medium text-foreground">Predictions ready</p>
            <p className="mt-1 text-muted-foreground">
              Commitment hash: <code className="rounded bg-muted px-1">{submitCommitment}</code>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" className="min-h-11" asChild>
                <Link to={`/league/${address}/enter?entryId=${encodeURIComponent(entryId)}`}>Continue to entry</Link>
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

