import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { defineChain } from "viem";
import { base, baseSepolia, mainnet } from "viem/chains";

function walletConnectProjectId(): string {
  const id = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
  if (id && id.trim() !== "") return id.trim();
  // Allows local `npm run dev` / tests without a real key; WalletConnect features may be limited.
  return "00000000000000000000000000000000";
}

/** Sonic mainnet — used with league creation wizard (Story 3.1 / 3.2). */
export const sonicMainnet = defineChain({
  id: 146,
  name: "Sonic",
  nativeCurrency: { decimals: 18, name: "Sonic", symbol: "S" },
  rpcUrls: {
    default: { http: ["https://rpc.soniclabs.com"] },
  },
  blockExplorers: {
    default: { name: "SonicScan", url: "https://sonicscan.org" },
  },
});

/**
 * RainbowKit + wagmi — Base Sepolia for local SIWE (Story 2.2) plus Base / Ethereum / Sonic
 * mainnets for Story 3.2 `createLeague` on the chains offered in the wizard.
 */
export const wagmiConfig = getDefaultConfig({
  appName: "WorldCup2",
  projectId: walletConnectProjectId(),
  chains: [baseSepolia, base, mainnet, sonicMainnet],
  ssr: false,
  wallets: [
    {
      groupName: "Recommended",
      wallets: [metaMaskWallet, rainbowWallet, coinbaseWallet, walletConnectWallet],
    },
  ],
});
