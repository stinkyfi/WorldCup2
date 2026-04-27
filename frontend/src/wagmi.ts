import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { baseSepolia } from "wagmi/chains";

function walletConnectProjectId(): string {
  const id = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
  if (id && id.trim() !== "") return id.trim();
  // Allows local `npm run dev` / tests without a real key; WalletConnect features may be limited.
  return "00000000000000000000000000000000";
}

/** RainbowKit + wagmi config — Base Sepolia (Base testnet) per Story 1.9 */
export const wagmiConfig = getDefaultConfig({
  appName: "WorldCup2",
  projectId: walletConnectProjectId(),
  chains: [baseSepolia],
  ssr: false,
});
