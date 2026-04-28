import { useCallback, useState } from "react";
import { erc20Abi, parseEventLogs, type Address } from "viem";
import { waitForTransactionReceipt } from "wagmi/actions";
import { useWriteContract } from "wagmi";
import type { CreateLeagueChainId } from "@/lib/createLeagueChains";
import { leagueFactoryAbi } from "@/lib/leagueFactoryAbi";
import { promotionUsdcRecipient, USDC_ADDRESS_BY_CHAIN } from "@/lib/createLeagueEnv";
import { wagmiConfig } from "@/wagmi";

export type LeagueParamsTuple = {
  token: Address;
  entryFee: bigint;
  maxEntries: bigint;
  maxEntriesPerWallet: bigint;
  minThreshold: bigint;
  revisionFee: bigint;
  revisionPolicy: number;
  lockTime: bigint;
};

export type CreateLeagueSubmitInput = {
  chainId: CreateLeagueChainId;
  factoryAddress: Address;
  creationFeeWei: bigint;
  params: LeagueParamsTuple;
  promotion: { enabled: true; usdcAmount: bigint } | { enabled: false };
};

function shortError(e: unknown): string {
  if (e instanceof Error) {
    const m = e.message;
    if (m.includes("User rejected") || m.includes("denied")) return "Transaction was rejected in your wallet.";
    if (m.length > 200) return `${m.slice(0, 200)}…`;
    return m;
  }
  return "Something went wrong. Try again.";
}

export function useCreateLeagueSubmit() {
  const { writeContractAsync } = useWriteContract();
  const [phase, setPhase] = useState<"idle" | "creating" | "promoting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const reset = useCallback(() => {
    setPhase("idle");
    setErrorMessage(null);
  }, []);

  const submit = useCallback(
    async (input: CreateLeagueSubmitInput): Promise<{ leagueAddress: Address }> => {
      setErrorMessage(null);
      setPhase("creating");
      try {
        const createHash = await writeContractAsync({
          address: input.factoryAddress,
          abi: leagueFactoryAbi,
          functionName: "createLeague",
          args: [input.params],
          value: input.creationFeeWei,
          chainId: input.chainId,
        });
        const receipt = await waitForTransactionReceipt(wagmiConfig, {
          hash: createHash,
          chainId: input.chainId,
        });
        if (receipt.status !== "success") {
          throw new Error("League creation transaction failed on-chain.");
        }
        const logs = parseEventLogs({
          abi: leagueFactoryAbi,
          logs: receipt.logs,
          eventName: "LeagueCreated",
        });
        const first = logs[0];
        const leagueAddress = first?.args.league;
        if (!leagueAddress) {
          throw new Error("Could not read new league address from transaction logs.");
        }

        if (input.promotion.enabled && input.promotion.usdcAmount > 0n) {
          const recipient = promotionUsdcRecipient();
          if (!recipient) {
            throw new Error("Promotion is enabled but VITE_PROMOTION_RECIPIENT is not set.");
          }
          const usdc = USDC_ADDRESS_BY_CHAIN[input.chainId];
          setPhase("promoting");
          const promoHash = await writeContractAsync({
            address: usdc,
            abi: erc20Abi,
            functionName: "transfer",
            args: [recipient, input.promotion.usdcAmount],
            chainId: input.chainId,
          });
          const promoReceipt = await waitForTransactionReceipt(wagmiConfig, {
            hash: promoHash,
            chainId: input.chainId,
          });
          if (promoReceipt.status !== "success") {
            throw new Error("Promotion USDC transfer failed. Your league was created; you can retry promotion later.");
          }
        }

        setPhase("idle");
        return { leagueAddress };
      } catch (e) {
        setPhase("error");
        const msg = shortError(e);
        setErrorMessage(msg);
        throw e;
      }
    },
    [writeContractAsync],
  );

  return { submit, phase, errorMessage, reset };
}
