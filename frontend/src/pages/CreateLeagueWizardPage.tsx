import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAddress } from "viem";
import { useAccount, useChainId, useReadContract, useSwitchChain } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CREATE_LEAGUE_CHAINS, type CreateLeagueChainId } from "@/lib/createLeagueChains";
import { leagueFactoryAddress, promotionUsdcRecipient } from "@/lib/createLeagueEnv";
import { entryFeeMinimumError, parseEntryFeeWei, parsePositiveInt } from "@/lib/createWizardFee";
import { fetchWhitelistedTokens, type WhitelistedTokenOption } from "@/lib/fetchWhitelistedTokens";
import { leagueFactoryAbi } from "@/lib/leagueFactoryAbi";
import { formatUsdc6, promotionUsdcTotalWei } from "@/lib/promotionPreview";
import { useCreateLeagueSubmit } from "@/lib/useCreateLeagueSubmit";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3 | 4 | 5 | 6;
type RevisionChoice = "locked" | "free" | "paid";

function revisionPolicyU8(r: RevisionChoice): number {
  if (r === "locked") return 0;
  if (r === "free") return 1;
  return 2;
}

function formatSubmitError(e: unknown): string {
  if (e instanceof Error) {
    const m = e.message;
    if (m.includes("User rejected") || m.includes("denied")) return "Transaction was rejected in your wallet.";
    if (m.length > 220) return `${m.slice(0, 220)}…`;
    return m;
  }
  return "Something went wrong. Try again.";
}

const stepLabels = ["Chain", "Token", "Fees & limits", "Revision", "Promotion", "Review"] as const;

export function CreateLeagueWizardPage() {
  const navigate = useNavigate();
  const { address: walletAddress, isConnected } = useAccount();
  const walletChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { submit, phase, errorMessage: txError, reset: resetTx } = useCreateLeagueSubmit();

  const [step, setStep] = useState<Step>(1);
  const [chainId, setChainId] = useState<CreateLeagueChainId | null>(null);
  const [token, setToken] = useState<WhitelistedTokenOption | null>(null);
  const [entryFeeInput, setEntryFeeInput] = useState("");
  const [maxEntriesInput, setMaxEntriesInput] = useState("");
  const [maxPerWalletInput, setMaxPerWalletInput] = useState("");
  const [minPlayersInput, setMinPlayersInput] = useState("");
  const [revision, setRevision] = useState<RevisionChoice>("locked");
  const [paidRevisionFeeInput, setPaidRevisionFeeInput] = useState("");
  const [promotionEnabled, setPromotionEnabled] = useState(false);
  const [promotionDays, setPromotionDays] = useState("3");
  const [lockDatetimeLocal, setLockDatetimeLocal] = useState("");
  const [immutabilityAck, setImmutabilityAck] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const factoryAddress = chainId ? leagueFactoryAddress(chainId) : undefined;
  const { data: creationFeeWei, isFetching: creationFeeLoading } = useReadContract({
    address: factoryAddress,
    abi: leagueFactoryAbi,
    functionName: "creationFee",
    chainId: chainId ?? undefined,
    query: { enabled: Boolean(factoryAddress && step === 6) },
  });

  const tokensQuery = useQuery({
    queryKey: ["whitelisted-tokens", chainId],
    queryFn: ({ signal }) => fetchWhitelistedTokens(chainId!, signal),
    enabled: chainId !== null,
    staleTime: 60_000,
  });

  const promotionWei = useMemo(() => {
    const d = Number(promotionDays);
    return promotionUsdcTotalWei(Number.isFinite(d) && d > 0 ? d : 0);
  }, [promotionDays]);

  const goNext = useCallback(() => {
    setStepError(null);
    setToast(null);
    resetTx();
    if (step === 1) {
      if (chainId === null) {
        setStepError("Select a chain before continuing.");
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!token) {
        setStepError("Select an entry token before continuing.");
        return;
      }
      setStep(3);
      return;
    }
    if (step === 3) {
      if (!token) {
        setStepError("Select a token on step 2.");
        return;
      }
      const fee = parseEntryFeeWei(entryFeeInput, token.decimals);
      if (fee.ok === false) {
        setStepError(fee.message);
        return;
      }
      const minErr = entryFeeMinimumError(fee.wei, token);
      if (minErr) {
        setStepError(minErr);
        return;
      }
      const maxE = parsePositiveInt("Max total entries", maxEntriesInput, { required: true });
      if (maxE.ok === false) {
        setStepError(maxE.message);
        return;
      }
      const maxW = parsePositiveInt("Max entries per wallet", maxPerWalletInput, { required: true });
      if (maxW.ok === false) {
        setStepError(maxW.message);
        return;
      }
      if (maxW.value! > maxE.value!) {
        setStepError("Max entries per wallet cannot exceed max total entries.");
        return;
      }
      const minP = parsePositiveInt("Minimum players (optional)", minPlayersInput, { required: false });
      if (minP.ok === false) {
        setStepError(minP.message);
        return;
      }
      if (minP.value !== undefined && minP.value > maxE.value!) {
        setStepError("Minimum players cannot exceed max total entries.");
        return;
      }
      setStep(4);
      return;
    }
    if (step === 4) {
      if (revision === "paid") {
        if (!token) {
          setStepError("Select a token before configuring paid revisions.");
          return;
        }
        const v = paidRevisionFeeInput.trim();
        const parsed = parseEntryFeeWei(v, token.decimals);
        if (!parsed.ok || parsed.wei <= 0n) {
          setStepError("Enter a positive paid revision fee amount (in the entry token).");
          return;
        }
      }
      setStep(5);
      return;
    }
    if (step === 5) {
      resetTx();
      setStep(6);
    }
  }, [
    step,
    chainId,
    token,
    entryFeeInput,
    maxEntriesInput,
    maxPerWalletInput,
    minPlayersInput,
    revision,
    paidRevisionFeeInput,
    resetTx,
  ]);

  const goBack = useCallback(() => {
    setStepError(null);
    setToast(null);
    if (step === 1) return;
    setStep((s) => (Math.max(1, s - 1) as Step));
  }, [step]);

  const busy = phase === "creating" || phase === "promoting";

  const onCreateLeague = useCallback(async () => {
    setStepError(null);
    setToast(null);
    resetTx();
    if (!isConnected || !walletAddress) {
      setStepError("Connect your wallet to create a league.");
      return;
    }
    if (!chainId || !token) {
      setStepError("Missing chain or token.");
      return;
    }
    if (!immutabilityAck) {
      setStepError("Confirm that you understand these settings are immutable.");
      return;
    }
    if (!lockDatetimeLocal) {
      setStepError("Choose when entries lock.");
      return;
    }
    const lockMs = new Date(lockDatetimeLocal).getTime();
    if (!Number.isFinite(lockMs)) {
      setStepError("Lock time is not a valid date.");
      return;
    }
    const lockUnix = BigInt(Math.floor(lockMs / 1000));
    const minLock = BigInt(Math.floor((Date.now() + 5 * 60_000) / 1000));
    if (lockUnix < minLock) {
      setStepError("Lock time must be at least 5 minutes from now.");
      return;
    }
    const factory = leagueFactoryAddress(chainId);
    if (!factory) {
      setStepError(
        `League factory is not configured for this chain. Set VITE_LEAGUE_FACTORY_${chainId} in your environment.`,
      );
      return;
    }
    if (creationFeeWei === undefined) {
      setStepError("Still loading creation fee from the factory. Try again in a moment.");
      return;
    }
    if (promotionEnabled && promotionWei > 0n && !promotionUsdcRecipient()) {
      setStepError("Turn off promotion or set VITE_PROMOTION_RECIPIENT for the USDC transfer.");
      return;
    }

    const fee = parseEntryFeeWei(entryFeeInput, token.decimals);
    if (fee.ok === false) {
      setStepError(fee.message);
      return;
    }
    const maxE = parsePositiveInt("Max total entries", maxEntriesInput, { required: true });
    const maxW = parsePositiveInt("Max entries per wallet", maxPerWalletInput, { required: true });
    const minP = parsePositiveInt("Minimum players (optional)", minPlayersInput, { required: false });
    if (!maxE.ok || !maxW.ok || !minP.ok || maxW.value! > maxE.value!) {
      setStepError("Fix entry limit fields before creating.");
      return;
    }

    const params = {
      token: token.address as `0x${string}`,
      entryFee: fee.wei,
      maxEntries: BigInt(maxE.value!),
      maxEntriesPerWallet: BigInt(maxW.value!),
      minThreshold: minP.value !== undefined ? BigInt(minP.value) : 0n,
      revisionFee:
        revision === "paid"
          ? (() => {
              const v = paidRevisionFeeInput.trim();
              const parsed = parseEntryFeeWei(v, token.decimals);
              return parsed.ok ? parsed.wei : 0n;
            })()
          : 0n,
      revisionPolicy: revisionPolicyU8(revision),
      lockTime: lockUnix,
    };

    try {
      if (walletChainId !== chainId) {
        await switchChainAsync({ chainId });
      }
    } catch {
      setStepError("Please switch your wallet to the selected chain and try again.");
      return;
    }

    try {
      const { leagueAddress } = await submit({
        chainId,
        factoryAddress: factory,
        creationFeeWei,
        params,
        promotion:
          promotionEnabled && promotionWei > 0n
            ? { enabled: true, usdcAmount: promotionWei }
            : { enabled: false },
      });
      const checksummed = getAddress(leagueAddress);
      setToast({
        kind: "success",
        text: `League deployed at ${checksummed.slice(0, 10)}…`,
      });
      void navigate(`/league/${checksummed}?created=1`);
    } catch (e) {
      setToast({ kind: "error", text: formatSubmitError(e) });
    }
  }, [
    isConnected,
    walletAddress,
    chainId,
    token,
    immutabilityAck,
    lockDatetimeLocal,
    creationFeeWei,
    promotionEnabled,
    promotionWei,
    entryFeeInput,
    maxEntriesInput,
    maxPerWalletInput,
    minPlayersInput,
    revision,
    paidRevisionFeeInput,
    walletChainId,
    switchChainAsync,
    submit,
    navigate,
    resetTx,
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <p className="text-sm font-medium text-muted-foreground">Create a league</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">New league wizard</h1>
        <p className="mt-2 text-muted-foreground">
          Configure your league, then sign the on-chain <code className="rounded bg-muted px-1">createLeague</code>{" "}
          transaction on the chain you selected. Optional USDC promotion runs as a second wallet signature when
          enabled.
        </p>
      </header>

      <ol className="mb-8 grid grid-cols-2 gap-2 text-xs font-medium text-muted-foreground sm:grid-cols-3 md:grid-cols-6" aria-label="Wizard progress">
        {([1, 2, 3, 4, 5, 6] as const).map((n) => (
          <li
            key={n}
            className={cn(
              "rounded-md border px-2 py-2 text-center sm:text-sm",
              step === n ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card/40",
            )}
          >
            {n}. {stepLabels[n - 1]}
          </li>
        ))}
      </ol>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>
            {step === 1 && "Choose chain"}
            {step === 2 && "Choose entry token"}
            {step === 3 && "Entry fee & entry limits"}
            {step === 4 && "Revision policy"}
            {step === 5 && "Promotion (optional)"}
            {step === 6 && "Review & create"}
          </CardTitle>
          <CardDescription>
            {step === 1 && "Leagues are chain-isolated. Pick where this league will live."}
            {step === 2 && "Only tokens whitelisted on the indexer for this chain are listed (FR12)."}
            {step === 3 &&
              token &&
              `Amounts use ${token.symbol} decimals (${token.decimals}). Minimum entry is enforced per token.`}
            {step === 4 && "Prediction revision mode and paid fee (if selected) are stored on-chain and immutable after creation."}
            {step === 5 &&
              "Default promotion is $20 USDC per day. You can skip; if enabled, a USDC transfer is sent after league creation (second signature)."}
            {step === 6 && "Confirm lock time, review all values, then sign with your wallet."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {step === 1 && (
            <fieldset className="space-y-3">
              <legend className="sr-only">Chain</legend>
              {CREATE_LEAGUE_CHAINS.map((c) => (
                <label
                  key={c.chainId}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors min-h-11",
                    chainId === c.chainId ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
                  )}
                >
                  <input
                    type="radio"
                    name="create-chain"
                    className="h-4 w-4 accent-primary"
                    checked={chainId === c.chainId}
                    onChange={() => {
                      setChainId(c.chainId);
                      setToken(null);
                    }}
                  />
                  <span className="text-sm font-medium text-foreground">{c.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">Chain ID {c.chainId}</span>
                </label>
              ))}
            </fieldset>
          )}

          {step === 2 && chainId !== null && (
            <div className="space-y-3">
              {tokensQuery.isLoading && <p className="text-sm text-muted-foreground">Loading tokens…</p>}
              {tokensQuery.isError && (
                <p className="text-sm text-destructive" role="alert">
                  {(tokensQuery.error as Error).message}
                </p>
              )}
              {tokensQuery.data && tokensQuery.data.data.tokens.length === 0 && (
                <p className="text-sm text-muted-foreground">No whitelisted tokens for this chain yet.</p>
              )}
              {tokensQuery.data &&
                tokensQuery.data.data.tokens.map((t) => (
                  <button
                    key={t.address}
                    type="button"
                    onClick={() => setToken(t)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors min-h-11",
                      token?.address.toLowerCase() === t.address.toLowerCase()
                        ? "border-primary bg-primary/5 font-medium"
                        : "border-border hover:bg-muted/40",
                    )}
                  >
                    <span>
                      {t.symbol}{" "}
                      <span className="text-muted-foreground font-normal">
                        ({t.decimals} decimals) · min {t.minEntryWei} wei
                      </span>
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{t.address.slice(0, 10)}…</span>
                  </button>
                ))}
            </div>
          )}

          {step === 3 && token && (
            <div className="space-y-4">
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Flat entry fee ({token.symbol})
                <Input
                  className="min-h-11"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder={token.decimals <= 6 ? "e.g. 10.5" : "e.g. 0.05"}
                  value={entryFeeInput}
                  onChange={(e) => setEntryFeeInput(e.target.value)}
                  aria-describedby="fee-hint"
                />
                <span id="fee-hint" className="text-xs font-normal text-muted-foreground">
                  Minimum (platform): {token.minEntryWei} smallest units for {token.symbol}.
                </span>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Max total entries
                <Input
                  className="min-h-11"
                  inputMode="numeric"
                  value={maxEntriesInput}
                  onChange={(e) => setMaxEntriesInput(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Max entries per wallet
                <Input
                  className="min-h-11"
                  inputMode="numeric"
                  value={maxPerWalletInput}
                  onChange={(e) => setMaxPerWalletInput(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Minimum players (optional)
                <Input
                  className="min-h-11"
                  inputMode="numeric"
                  placeholder="Leave empty if not used"
                  value={minPlayersInput}
                  onChange={(e) => setMinPlayersInput(e.target.value)}
                  aria-describedby="min-players-hint"
                />
                <span id="min-players-hint" className="text-xs font-normal text-muted-foreground">
                  If set, must be a positive whole number and cannot exceed max total entries.
                </span>
              </label>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              {(
                [
                  { id: "locked" as const, title: "Locked", desc: "No prediction changes after entry." },
                  { id: "free" as const, title: "Free revisions", desc: "Players may revise predictions for free until lock." },
                  { id: "paid" as const, title: "Paid revisions", desc: "Players pay to revise (fee captured off-chain for now)." },
                ] as const
              ).map((opt) => (
                <label
                  key={opt.id}
                  className={cn(
                    "flex cursor-pointer flex-col gap-1 rounded-lg border px-4 py-3 min-h-11",
                    revision === opt.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="revision-policy"
                      className="h-4 w-4 accent-primary"
                      checked={revision === opt.id}
                      onChange={() => setRevision(opt.id)}
                    />
                    <span className="text-sm font-medium">{opt.title}</span>
                  </span>
                  <span className="pl-6 text-xs text-muted-foreground">{opt.desc}</span>
                </label>
              ))}
              {revision === "paid" && (
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Paid revision fee
                  <Input
                    className="min-h-11"
                    inputMode="decimal"
                    value={paidRevisionFeeInput}
                    onChange={(e) => setPaidRevisionFeeInput(e.target.value)}
                    placeholder="e.g. 1.5 (in entry token)"
                  />
                </label>
              )}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-primary"
                  checked={promotionEnabled}
                  onChange={(e) => setPromotionEnabled(e.target.checked)}
                />
                Add paid promotion (USDC transfer after league creation)
              </label>
              {promotionEnabled && (
                <>
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    Duration (days)
                    <Input
                      className="min-h-11"
                      inputMode="numeric"
                      value={promotionDays}
                      onChange={(e) => setPromotionDays(e.target.value)}
                    />
                  </label>
                  <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
                    <span className="font-medium">Preview:</span> {formatUsdc6(promotionWei)} USDC total (
                    <span className="text-muted-foreground">$20/day × {promotionDays || "0"} days</span>).
                    <span className="block text-muted-foreground">
                      In entry token:{" "}
                      {token?.symbol === "USDC" ? `${formatUsdc6(promotionWei)} USDC` : "Pricing unavailable"}
                    </span>
                  </p>
                </>
              )}
            </div>
          )}

          {step === 6 && chainId && token && (
            <div className="space-y-4">
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Lock entries (local time)
                <Input
                  className="min-h-11"
                  type="datetime-local"
                  value={lockDatetimeLocal}
                  onChange={(e) => setLockDatetimeLocal(e.target.value)}
                />
              </label>

              <div className="rounded-md border border-border bg-muted/20 p-4 text-sm space-y-2">
                <p className="font-medium text-foreground">Summary</p>
                <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                  <li>Chain ID {chainId}</li>
                  <li>
                    Token {token.symbol} ({token.address.slice(0, 10)}…)
                  </li>
                  <li>Entry fee (input): {entryFeeInput || "—"}</li>
                  <li>
                    Max entries {maxEntriesInput || "—"}, per wallet {maxPerWalletInput || "—"}, min players{" "}
                    {minPlayersInput || "none"}
                  </li>
                  <li>Revision: {revision}</li>
                  {revision === "paid" && <li>Paid revision fee: {paidRevisionFeeInput || "—"}</li>}
                  <li>
                    Promotion: {promotionEnabled ? `${formatUsdc6(promotionWei)} USDC` : "None"}
                  </li>
                </ul>
              </div>

              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-foreground">
                <p className="font-medium">Immutability</p>
                <p className="mt-1 text-muted-foreground">
                  League parameters baked into the contract cannot be changed after deployment.
                </p>
                <label className="mt-3 flex items-start gap-2 font-medium">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded accent-primary"
                    checked={immutabilityAck}
                    onChange={(e) => setImmutabilityAck(e.target.checked)}
                  />
                  <span>I understand these settings cannot be changed after creation</span>
                </label>
              </div>

              <div className="rounded-md border border-border bg-card/60 p-4 text-sm space-y-1">
                <p className="font-medium">Fees before signing</p>
                {factoryAddress ? (
                  <>
                    <p>
                      <span className="text-muted-foreground">Native creation fee (factory):</span>{" "}
                      {creationFeeLoading || creationFeeWei === undefined
                        ? "Loading…"
                        : `${creationFeeWei.toString()} wei`}
                    </p>
                    {promotionEnabled && promotionWei > 0n && (
                      <p>
                        <span className="text-muted-foreground">Promotion (USDC):</span> {formatUsdc6(promotionWei)}{" "}
                        USDC
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-destructive">
                    Set <code className="rounded bg-muted px-1">VITE_LEAGUE_FACTORY_{chainId}</code> to continue.
                  </p>
                )}
              </div>
            </div>
          )}

          {stepError && (
            <p className="text-sm text-destructive" role="alert">
              {stepError}
            </p>
          )}
          {txError && step === 6 && (
            <p className="text-sm text-destructive" role="alert">
              {txError}
            </p>
          )}

          {toast && (
            <p
              className={cn(
                "rounded-md border px-3 py-2 text-sm",
                toast.kind === "success"
                  ? "border-primary/50 bg-primary/10 text-foreground"
                  : "border-destructive/50 bg-destructive/10 text-destructive",
              )}
              role="status"
            >
              {toast.text}
            </p>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="button" variant="secondary" className="min-h-11" onClick={goBack} disabled={step === 1 || busy}>
              Back
            </Button>
            {step < 6 ? (
              <Button type="button" className="min-h-11" onClick={goNext} disabled={busy}>
                Continue
              </Button>
            ) : (
              <Button
                type="button"
                className="min-h-11"
                onClick={() => void onCreateLeague()}
                disabled={
                  busy ||
                  !immutabilityAck ||
                  !factoryAddress ||
                  creationFeeWei === undefined ||
                  creationFeeLoading
                }
              >
                {busy ? (phase === "promoting" ? "Signing promotion…" : "Creating league…") : "Create league"}
              </Button>
            )}
            {step === 6 && txError && (
              <Button type="button" variant="secondary" className="min-h-11" onClick={() => void onCreateLeague()} disabled={busy}>
                Retry
              </Button>
            )}
            <Button type="button" variant="ghost" className="min-h-11" asChild disabled={busy}>
              <Link to="/">Cancel</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
