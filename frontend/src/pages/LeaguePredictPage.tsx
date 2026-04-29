import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { type Address, getAddress } from "viem";
import { waitForTransactionReceipt } from "wagmi/actions";
import { useAccount, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { ArrowLeft, ArrowRight, CheckCircle2, GripVertical, MousePointer2, Sparkles, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PredictionProgressBar } from "@/components/PredictionProgressBar";
import {
  createEntryId,
  getEntryIndexFromStorage,
  migrateLegacyV1IfPresent,
  savePredictionToStorage,
  type PredictionPayloadV2,
} from "@/lib/predictionCommitment";
import { erc20Abi } from "@/lib/erc20Abi";
import { leagueAbi } from "@/lib/leagueAbi";
import { fetchLeagueDetail } from "@/lib/leagueDetail";
import { fetchPolymarketOdds } from "@/lib/polymarketOdds";
import { extractPolymarketWinOddsByTeamName, formatPolymarketPercent } from "@/lib/polymarketTeamWinOdds";
import { WORLD_CUP_GROUPS, type WorldCupGroupId } from "@/lib/worldCupGroups";
import { TeamNameWithFlag } from "@/components/TeamWithFlag";
import { cn } from "@/lib/utils";
import { wagmiConfig } from "@/wagmi";

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
  right,
}: {
  id: string;
  label: ReactNode;
  right?: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex min-h-11 items-center gap-2 rounded-lg border border-border/70 bg-background/35 px-3 py-2 text-sm shadow-inner shadow-black/10 transition-colors",
        "hover:border-accent/30 hover:bg-background/45",
        "cursor-grab active:cursor-grabbing",
        isDragging ? "opacity-70 ring-1 ring-accent/35" : "",
      )}
      {...attributes}
      {...listeners}
      title="Drag to reorder"
    >
      <span
        className="flex items-center gap-2 text-muted-foreground"
        aria-label="Drag handle"
        title="Drag handle"
      >
        <GripVertical className="size-4 opacity-75 transition-opacity group-hover:opacity-100" />
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span className="min-w-0 truncate font-medium text-foreground">{label}</span>
        {right ? <span className="hidden text-xs text-muted-foreground md:inline-flex">{right}</span> : null}
      </span>
      <span className="ml-auto hidden items-center gap-2 text-xs text-muted-foreground md:flex">
        <MousePointer2 className="size-3.5" />
        <span className="font-medium text-foreground/90">Drag</span>
        <span>to rank</span>
      </span>
    </div>
  );
}

export function LeaguePredictPage() {
  const { address = "" } = useParams();
  const [search] = useSearchParams();
  const entryIdFromUrl = search.get("entryId");
  const isValidAddress = useMemo(() => isAddress(address), [address]);
  const { address: walletAddress, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const [orderByGroup, setOrderByGroup] = useState<GroupOrderState>(() => initState());
  const [tiebreaker, setTiebreaker] = useState<string>("");
  const [confirmedGroups, setConfirmedGroups] = useState<Set<WorldCupGroupId>>(() => new Set());
  const [submitCommitment, setSubmitCommitment] = useState<`0x${string}` | null>(null);
  const [entryId] = useState<string>(() => entryIdFromUrl ?? createEntryId());
  const [reviseBusy, setReviseBusy] = useState<null | "approving" | "revising">(null);
  const [reviseError, setReviseError] = useState<string | null>(null);
  const [reviseSuccess, setReviseSuccess] = useState(false);
  const [wizardStage, setWizardStage] = useState<"intro" | "groups" | "tiebreaker">("intro");
  const [wizardGroupIdx, setWizardGroupIdx] = useState<number>(0);

  const validAddress = isValidAddress ? address : null;
  const leagueQuery = useQuery({
    queryKey: ["league-detail", validAddress],
    queryFn: ({ signal }) => fetchLeagueDetail(validAddress!, signal),
    enabled: Boolean(validAddress),
    staleTime: 20_000,
    retry: 1,
  });
  const league = leagueQuery.data?.data.league;
  const leagueChainId = league?.chainId as 1 | 146 | 8453 | 84532 | undefined;
  const leagueAddr = isValidAddress ? (getAddress(address) as Address) : undefined;
  const tokenAddr = league?.entryTokenAddress ? (getAddress(league.entryTokenAddress) as Address) : undefined;

  const entryIndex =
    isValidAddress && walletAddress ? getEntryIndexFromStorage({ leagueAddress: address, walletAddress, entryId }) : null;

  const { data: revisionPolicy } = useReadContract({
    address: leagueAddr,
    abi: leagueAbi,
    functionName: "revisionPolicy",
    chainId: leagueChainId,
    query: { enabled: Boolean(leagueAddr && leagueChainId) },
  });
  const { data: revisionFee } = useReadContract({
    address: leagueAddr,
    abi: leagueAbi,
    functionName: "revisionFee",
    chainId: leagueChainId,
    query: { enabled: Boolean(leagueAddr && leagueChainId) },
  });

  const paidRevisions = typeof revisionPolicy !== "undefined" ? Number(revisionPolicy) === 2 : false;

  const { data: revisionAllowance } = useReadContract({
    address: tokenAddr,
    abi: erc20Abi,
    functionName: "allowance",
    args: walletAddress && leagueAddr ? [walletAddress, leagueAddr] : undefined,
    chainId: leagueChainId,
    query: {
      enabled: Boolean(isConnected && paidRevisions && walletAddress && tokenAddr && leagueAddr && leagueChainId),
      staleTime: 5_000,
    },
  });

  const revisionAllowanceEnough =
    paidRevisions &&
    typeof revisionAllowance !== "undefined" &&
    typeof revisionFee !== "undefined" &&
    revisionAllowance >= revisionFee;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const completedGroups = confirmedGroups.size;
  const tiebreakerFilled = /^\d+$/.test(tiebreaker.trim()) && Number(tiebreaker.trim()) >= 1 && Number(tiebreaker.trim()) <= 1000;
  const canSubmit = completedGroups === 12 && tiebreakerFilled;

  const currentGroup = WORLD_CUP_GROUPS[Math.min(WORLD_CUP_GROUPS.length - 1, Math.max(0, wizardGroupIdx))]!;
  const currentOrder = orderByGroup[currentGroup.id];
  const currentTeamById = useMemo(
    () => new Map(currentGroup.teams.map((t) => [t.id, t.name] as const)),
    [currentGroup.teams],
  );
  const currentConfirmed = confirmedGroups.has(currentGroup.id);

  const polymarketQuery = useQuery({
    queryKey: ["polymarket-odds", currentGroup.id],
    queryFn: ({ signal }) => fetchPolymarketOdds({ group: currentGroup.id, signal }),
    staleTime: 60_000,
    retry: 0,
    enabled: wizardStage === "groups",
  });

  const polymarketForGroup = useMemo(() => {
    if (!polymarketQuery.data) return null;
    try {
      return extractPolymarketWinOddsByTeamName(polymarketQuery.data);
    } catch {
      return null;
    }
  }, [polymarketQuery.data]);

  function confirmCurrentGroup() {
    setConfirmedGroups((prev) => new Set(prev).add(currentGroup.id));
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
    setReviseSuccess(false);
    setReviseError(null);
  }

  async function ensureChain() {
    if (!leagueChainId) return;
    await switchChainAsync({ chainId: leagueChainId });
  }

  async function onReviseOnchain() {
    setReviseError(null);
    setReviseSuccess(false);
    if (!submitCommitment) return;
    if (!isConnected || !walletAddress) {
      setReviseError("Connect a wallet to revise.");
      return;
    }
    if (!leagueChainId || !leagueAddr || !tokenAddr) {
      setReviseError("League is missing chain or contract details.");
      return;
    }
    if (entryIndex === null) {
      setReviseError("Enter the league first (this entry slot has no on-chain index yet).");
      return;
    }
    if (typeof revisionPolicy === "undefined") {
      setReviseError("Could not read revision policy.");
      return;
    }
    if (Number(revisionPolicy) === 0) {
      setReviseError("This league does not allow prediction revisions.");
      return;
    }
    try {
      await ensureChain();

      if (paidRevisions) {
        if (typeof revisionFee === "undefined") {
          setReviseError("Could not read revision fee.");
          return;
        }
        if (!revisionAllowanceEnough) {
          setReviseBusy("approving");
          const approveHash = await writeContractAsync({
            address: tokenAddr,
            abi: erc20Abi,
            functionName: "approve",
            args: [leagueAddr, revisionFee],
            chainId: leagueChainId,
          });
          await waitForTransactionReceipt(wagmiConfig, { hash: approveHash, chainId: leagueChainId });
        }
      }

      setReviseBusy("revising");
      const reviseHash = await writeContractAsync({
        address: leagueAddr,
        abi: leagueAbi,
        functionName: "revise",
        args: [BigInt(entryIndex), submitCommitment],
        chainId: leagueChainId,
      });
      await waitForTransactionReceipt(wagmiConfig, { hash: reviseHash, chainId: leagueChainId });
      setReviseSuccess(true);
    } catch (e) {
      const m = (e as Error | null | undefined)?.message ?? "";
      if (m.includes("LeagueLocked")) setReviseError("League is locked. Revisions are closed.");
      else if (m.includes("RevisionsLocked")) setReviseError("This league does not allow revisions.");
      else if (m.includes("InvalidEntryIndex")) setReviseError("Invalid entry index for this wallet.");
      else if (m.toLowerCase().includes("user rejected") || m.toLowerCase().includes("rejected"))
        setReviseError("Transaction rejected in wallet.");
      else setReviseError("Revision failed. Please try again.");
    } finally {
      setReviseBusy(null);
    }
  }

  return (
    <div className="relative">
      <PredictionProgressBar completedGroups={completedGroups} totalGroups={12} tiebreakerFilled={tiebreakerFilled} />

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex size-10 items-center justify-center rounded-xl border border-accent/25 bg-accent/10">
                <Swords className="size-5 text-accent" />
              </span>
              <div>
                <h1 className="text-2xl font-semibold text-gradient-brand">Prediction Arena</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Rank each group’s teams 1–4. Drag on desktop; mobile uses selectors.
                </p>
              </div>
            </div>
          </div>
          <Button type="button" variant="secondary" asChild className="min-h-11">
            <Link to={`/league/${address}`}>Back to league</Link>
          </Button>
        </div>

        {wizardStage === "intro" ? (
          <div className="border-gradient-brand rounded-xl bg-card/40 p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent/95">Wizard</p>
                <p className="font-display mt-1 text-xl font-semibold text-foreground">Draft your bracket, one group at a time</p>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  You’ll confirm each group A–L, then set the tiebreaker and submit. Want market odds? Check the homepage
                  “Market intel” panel.
                </p>
              </div>
              <Button
                type="button"
                className="min-h-11"
                onClick={() => {
                  setWizardStage("groups");
                  setWizardGroupIdx(0);
                }}
              >
                Start wizard
              </Button>
            </div>
          </div>
        ) : null}

        {wizardStage === "groups" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm text-muted-foreground">
                Group <span className="font-semibold text-foreground">{currentGroup.id}</span> · Step{" "}
                <span className="font-mono text-foreground">{wizardGroupIdx + 1}/12</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-11"
                  onClick={() => setWizardStage("intro")}
                >
                  Back to intro
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-11"
                  onClick={() => setWizardGroupIdx((i) => Math.max(0, i - 1))}
                  disabled={wizardGroupIdx === 0}
                >
                  <ArrowLeft className="mr-2 size-4" />
                  Prev
                </Button>
                <Button
                  type="button"
                  className="min-h-11"
                  onClick={() => {
                    if (!currentConfirmed) confirmCurrentGroup();
                    setWizardGroupIdx((i) => Math.min(11, i + 1));
                  }}
                  disabled={wizardGroupIdx === 11 && !currentConfirmed}
                  title={!currentConfirmed && wizardGroupIdx === 11 ? "Confirm the last group to continue." : undefined}
                >
                  Next
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </div>
            </div>

            <Card className="border-gradient-brand bg-card/40">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{currentGroup.label}</CardTitle>
                    <CardDescription>
                      Drag to set positions 1–4{" "}
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <GripVertical className="size-3.5" /> handle
                      </span>
                    </CardDescription>
                  </div>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                      currentConfirmed
                        ? "border-accent/25 bg-accent/10 text-accent"
                        : "border-border bg-background/35 text-muted-foreground hover:bg-background/50",
                    )}
                    onClick={() => confirmCurrentGroup()}
                    title={currentConfirmed ? "Confirmed" : "Confirm group"}
                  >
                    <CheckCircle2 className="size-3.5" />
                    {currentConfirmed ? "Confirmed" : "Confirm"}
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={({ active, over }) => {
                    if (!over) return;
                    const activeId = String(active.id);
                    const overId = String(over.id);
                    if (activeId === overId) return;
                    const ids = currentOrder;
                    const oldIndex = ids.indexOf(activeId);
                    const newIndex = ids.indexOf(overId);
                    if (oldIndex === -1 || newIndex === -1) return;
                    setOrderByGroup((prev) => ({ ...prev, [currentGroup.id]: arrayMove(prev[currentGroup.id], oldIndex, newIndex) }));
                    confirmCurrentGroup();
                  }}
                >
                  <SortableContext items={currentOrder} strategy={verticalListSortingStrategy}>
                    {currentOrder.map((id, idx) => (
                      <div key={id} className="flex items-center gap-2">
                        <span className="w-6 text-xs font-mono text-muted-foreground">{idx + 1}</span>
                        <div className="flex-1">
                          <SortableTeamRow
                            id={id}
                            label={<TeamNameWithFlag teamName={currentTeamById.get(id) ?? id} />}
                            right={
                              polymarketForGroup ? (
                                (() => {
                                  const name = currentTeamById.get(id) ?? id;
                                  const pct = polymarketForGroup.percentByTeamName.get(name);
                                  if (typeof pct !== "number" || !Number.isFinite(pct)) return <span>Polymarket: —</span>;
                                  return (
                                    <span title="Polymarket win % (implied probability)">
                                      Polymarket: {formatPolymarketPercent(pct)}
                                    </span>
                                  );
                                })()
                              ) : polymarketQuery.isLoading ? (
                                <span>Polymarket: …</span>
                              ) : (
                                <span>Polymarket: —</span>
                              )
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </SortableContext>
                </DndContext>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                type="button"
                className="min-h-11"
                onClick={() => setWizardStage("tiebreaker")}
                disabled={confirmedGroups.size < 12}
                title={confirmedGroups.size < 12 ? "Confirm all groups to continue." : undefined}
              >
                Continue to tiebreaker
                <Sparkles className="ml-2 size-4" />
              </Button>
            </div>
          </div>
        ) : null}

        {wizardStage === "tiebreaker" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm text-muted-foreground">
                Final step ·{" "}
                <span className="font-medium text-foreground">
                  {confirmedGroups.size}/12 groups confirmed
                </span>
              </div>
              <Button type="button" variant="secondary" className="min-h-11" onClick={() => setWizardStage("groups")}>
                Back to groups
              </Button>
            </div>
          </div>
        ) : null}

        <Card className={cn("mt-6", wizardStage !== "tiebreaker" ? "opacity-60 pointer-events-none select-none" : "")}>
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
          <div className="dd-callout mt-6 p-4">
            <p className="font-medium text-foreground">Predictions ready</p>
            <p className="mt-1 text-muted-foreground">
              Commitment hash: <code className="rounded bg-muted px-1">{submitCommitment}</code>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" className="min-h-11" asChild>
                <Link to={`/league/${address}/enter?entryId=${encodeURIComponent(entryId)}`}>Continue to entry</Link>
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="min-h-11"
                disabled={entryIndex === null || reviseBusy !== null || !submitCommitment}
                onClick={() => void onReviseOnchain()}
                title={entryIndex === null ? "Enter the league first to get an on-chain entry index." : undefined}
              >
                {reviseBusy === "approving"
                  ? "Approving…"
                  : reviseBusy === "revising"
                    ? "Revising…"
                    : "Update on-chain (revise)"}
              </Button>
            </div>
            {reviseSuccess ? <p className="mt-3 text-sm text-foreground">On-chain commitment updated for this entry.</p> : null}
            {reviseError ? <p className="mt-3 text-sm text-destructive">{reviseError}</p> : null}
            {entryIndex === null ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Tip: after you enter successfully, come back here (same `entryId`) to revise on-chain.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

