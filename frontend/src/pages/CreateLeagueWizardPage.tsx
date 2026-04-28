import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CREATE_LEAGUE_CHAINS, type CreateLeagueChainId } from "@/lib/createLeagueChains";
import { entryFeeMinimumError, parseEntryFeeWei, parsePositiveInt } from "@/lib/createWizardFee";
import { fetchWhitelistedTokens, type WhitelistedTokenOption } from "@/lib/fetchWhitelistedTokens";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3;

export function CreateLeagueWizardPage() {
  const [step, setStep] = useState<Step>(1);
  const [chainId, setChainId] = useState<CreateLeagueChainId | null>(null);
  const [token, setToken] = useState<WhitelistedTokenOption | null>(null);
  const [entryFeeInput, setEntryFeeInput] = useState("");
  const [maxEntriesInput, setMaxEntriesInput] = useState("");
  const [maxPerWalletInput, setMaxPerWalletInput] = useState("");
  const [minPlayersInput, setMinPlayersInput] = useState("");
  const [stepError, setStepError] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);

  const tokensQuery = useQuery({
    queryKey: ["whitelisted-tokens", chainId],
    queryFn: ({ signal }) => fetchWhitelistedTokens(chainId!, signal),
    enabled: chainId !== null,
    staleTime: 60_000,
  });

  const goNext = useCallback(() => {
    setStepError(null);
    setDraftSaved(false);
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
      if (!fee.ok) {
        setStepError(fee.message);
        return;
      }
      const minErr = entryFeeMinimumError(fee.wei, token);
      if (minErr) {
        setStepError(minErr);
        return;
      }
      const maxE = parsePositiveInt("Max total entries", maxEntriesInput, { required: true });
      if (!maxE.ok) {
        setStepError(maxE.message);
        return;
      }
      const maxW = parsePositiveInt("Max entries per wallet", maxPerWalletInput, { required: true });
      if (!maxW.ok) {
        setStepError(maxW.message);
        return;
      }
      if (maxW.value! > maxE.value!) {
        setStepError("Max entries per wallet cannot exceed max total entries.");
        return;
      }
      const minP = parsePositiveInt("Minimum players (optional)", minPlayersInput, { required: false });
      if (!minP.ok) {
        setStepError(minP.message);
        return;
      }
      if (minP.value !== undefined && minP.value > maxE.value!) {
        setStepError("Minimum players cannot exceed max total entries.");
        return;
      }
      setDraftSaved(true);
    }
  }, [step, chainId, token, entryFeeInput, maxEntriesInput, maxPerWalletInput, minPlayersInput]);

  const goBack = useCallback(() => {
    setStepError(null);
    setDraftSaved(false);
    if (step === 1) return;
    setStep((s) => (s === 3 ? 2 : 1) as Step);
  }, [step]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <p className="text-sm font-medium text-muted-foreground">Create a league</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">New league wizard</h1>
        <p className="mt-2 text-muted-foreground">
          Steps 1–3: chain, whitelisted entry token, and entry limits. Revision policy and on-chain creation ship in Story
          3.2.
        </p>
      </header>

      <ol className="mb-8 flex gap-2 text-sm font-medium text-muted-foreground" aria-label="Wizard progress">
        {([1, 2, 3] as const).map((n) => (
          <li
            key={n}
            className={cn(
              "flex-1 rounded-md border px-3 py-2 text-center",
              step === n ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card/40",
            )}
          >
            {n}. {n === 1 ? "Chain" : n === 2 ? "Token" : "Fees & limits"}
          </li>
        ))}
      </ol>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>
            {step === 1 && "Choose chain"}
            {step === 2 && "Choose entry token"}
            {step === 3 && "Entry fee & entry limits"}
          </CardTitle>
          <CardDescription>
            {step === 1 && "Leagues are chain-isolated. Pick where this league will live."}
            {step === 2 && "Only tokens whitelisted on the indexer for this chain are listed (FR12)."}
            {step === 3 &&
              token &&
              `Amounts use ${token.symbol} decimals (${token.decimals}). Minimum entry is enforced per token.`}
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

          {stepError && (
            <p className="text-sm text-destructive" role="alert">
              {stepError}
            </p>
          )}
          {draftSaved && (
            <p className="rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-sm text-foreground" role="status">
              Draft for steps 1–3 is valid. Story 3.2 adds revision policy, promotion, review, and the on-chain{" "}
              <code className="rounded bg-muted px-1">createLeague</code> transaction.
            </p>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="button" variant="secondary" className="min-h-11" onClick={goBack} disabled={step === 1}>
              Back
            </Button>
            <Button type="button" className="min-h-11" onClick={goNext}>
              {step === 3 ? "Validate draft" : "Continue"}
            </Button>
            <Button type="button" variant="ghost" className="min-h-11" asChild>
              <Link to="/">Cancel</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
