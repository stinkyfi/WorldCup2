import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { baseSepolia } from "wagmi/chains";

function walletConnectProjectId(): string {
  const id = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
  if (id && id.trim() !== "") return id.trim();
  // Allows local `npm run dev` / tests without a real key; WalletConnect features may be limited.
  return "00000000000000000000000000000000";
}

/** RainbowKit + wagmi config — Base Sepolia (Base testnet) per Story 1.9; FR1 wallet list for Story 2.2 */
export const wagmiConfig = getDefaultConfig({
  appName: "WorldCup2",
  projectId: walletConnectProjectId(),
  chains: [baseSepolia],
  ssr: false,
  wallets: [
    {
      groupName: "Recommended",
      wallets: [metaMaskWallet, rainbowWallet, coinbaseWallet, walletConnectWallet],
    },
  ],
});
