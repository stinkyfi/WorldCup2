import { useEffect, useMemo, useState } from "react";
import type { Address } from "viem";
import { useChainId } from "wagmi";
import { resolveWalletIdentity, shortAddress } from "@/lib/walletIdentity";

export function useWalletPrimaryIdentity(address: string | undefined) {
  const chainId = useChainId();
  const baseLabel = useMemo(() => (address ? shortAddress(address) : ""), [address]);
  const [label, setLabel] = useState(() => baseLabel);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      return;
    }
    let cancelled = false;
    void resolveWalletIdentity(address as Address, chainId).then((r) => {
      if (cancelled) return;
      setLabel(r.label);
      setAvatarUrl(r.avatarUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [address, chainId]);

  return { label: address ? label : "", avatarUrl: address ? avatarUrl : null, baseLabel };
}
