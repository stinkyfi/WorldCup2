import { createPublicClient, http, type Address } from "viem";
import { mainnet } from "viem/chains";
import { getEnsAvatar, getEnsName, normalize, toCoinType } from "viem/ens";

const mainnetPublic = createPublicClient({
  chain: mainnet,
  transport: http("https://cloudflare-eth.com"),
});

export function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/**
 * Resolve Ethereum mainnet ENS + Base primary name (ENSIP-9 reverse via L1 universal resolver).
 * On Base / Base Sepolia, prefer the Base primary name when set; otherwise L1 ENS, then address.
 */
export async function resolveWalletIdentity(
  address: Address,
  activeChainId: number,
): Promise<{ label: string; avatarUrl: string | null }> {
  const fallback = shortAddress(address);

  const [ethRes, baseRes] = await Promise.allSettled([
    getEnsName(mainnetPublic, { address }),
    getEnsName(mainnetPublic, { address, coinType: toCoinType(8453) }),
  ]);

  const ethName = ethRes.status === "fulfilled" ? ethRes.value : null;
  const baseName = baseRes.status === "fulfilled" ? baseRes.value : null;

  const preferBase = activeChainId === 8453 || activeChainId === 84532;
  const chosenName = preferBase ? baseName ?? ethName : ethName ?? baseName;

  if (!chosenName) {
    return { label: fallback, avatarUrl: null };
  }

  let avatarUrl: string | null = null;
  try {
    const normalized = normalize(chosenName);
    avatarUrl = await getEnsAvatar(mainnetPublic, { name: normalized });
  } catch {
    avatarUrl = null;
  }

  return { label: chosenName, avatarUrl };
}
