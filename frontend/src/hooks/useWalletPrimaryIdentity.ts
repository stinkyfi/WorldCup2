import { useEffect, useState } from "react";
import type { Address } from "viem";
import { useChainId } from "wagmi";
import { resolveWalletIdentity, shortAddress } from "@/lib/walletIdentity";

export function useWalletPrimaryIdentity(address: string | undefined) {
  const chainId = useChainId();
  const [label, setLabel] = useState(() => (address ? shortAddress(address) : ""));
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setLabel("");
      setAvatarUrl(null);
      return;
    }
    setLabel(shortAddress(address));
    setAvatarUrl(null);
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

  return { label, avatarUrl };
}
