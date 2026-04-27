import { defineConfig, configVariable } from "hardhat/config";
import hardhatToolboxViem from "@nomicfoundation/hardhat-toolbox-viem";

// configVariable() is lazy — only resolved when Hardhat actually needs the value.
// `npx hardhat compile` and `npx hardhat test` work fine without env vars set.

export default defineConfig({
  plugins: [hardhatToolboxViem],

  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },

  networks: {
    // ── Local ──────────────────────────────────────────────────────────────────
    // Hardhat's built-in network is always available (no config needed)

    // ── Base ───────────────────────────────────────────────────────────────────
    "base-testnet": {
      type: "http",
      url: configVariable("RPC_URL_BASE_TESTNET"),
    },
    "base-mainnet": {
      type: "http",
      url: configVariable("RPC_URL_BASE_MAINNET"),
    },

    // ── Ethereum ───────────────────────────────────────────────────────────────
    "ethereum-sepolia": {
      type: "http",
      url: configVariable("RPC_URL_ETHEREUM_SEPOLIA"),
    },
    "ethereum-mainnet": {
      type: "http",
      url: configVariable("RPC_URL_ETHEREUM_MAINNET"),
    },

    // ── Sonic ──────────────────────────────────────────────────────────────────
    "sonic-testnet": {
      type: "http",
      url: configVariable("RPC_URL_SONIC_TESTNET"),
    },
    "sonic-mainnet": {
      type: "http",
      url: configVariable("RPC_URL_SONIC_MAINNET"),
    },
  },

  // Etherscan API v2 — a single API key works across all supported chains.
  // NOTE: Hardhat 3 verify.etherscan.apiKey only accepts a single string/ConfigVariable.
  // Sonic chain verification requires passing --api-key manually or using a separate task.
  // chainDescriptors adds block explorer URLs for chains not natively known to hardhat-verify.
  verify: {
    etherscan: {
      apiKey: configVariable("ETHERSCAN_API_KEY"),
    },
  },

  chainDescriptors: {
    // Base Sepolia (testnet)
    84532: {
      name: "base-testnet",
      blockExplorers: {
        etherscan: {
          name: "BaseScan Sepolia",
          url: "https://sepolia.basescan.org",
          apiUrl: "https://api-sepolia.basescan.org/api",
        },
      },
    },
    // Base Mainnet
    8453: {
      name: "base-mainnet",
      blockExplorers: {
        etherscan: {
          name: "BaseScan",
          url: "https://basescan.org",
          apiUrl: "https://api.basescan.org/api",
        },
      },
    },
    // Sonic Blaze (testnet)
    57054: {
      name: "sonic-testnet",
      blockExplorers: {
        etherscan: {
          name: "SonicScan Testnet",
          url: "https://testnet.sonicscan.org",
          apiUrl: "https://api-testnet.sonicscan.org/api",
        },
      },
    },
    // Sonic Mainnet
    146: {
      name: "sonic-mainnet",
      blockExplorers: {
        etherscan: {
          name: "SonicScan",
          url: "https://sonicscan.org",
          apiUrl: "https://api.sonicscan.org/api",
        },
      },
    },
  },
});

