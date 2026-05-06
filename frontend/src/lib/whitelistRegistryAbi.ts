import { parseAbi } from "viem";

export const whitelistRegistryAbi = parseAbi([
  "function isWhitelisted(address token) view returns (bool)",
  "function requestFeeToken() view returns (address)",
  "function requestFeeAmount() view returns (uint256)",
  "function requestWhitelist(address token)",
  "event WhitelistRequested(address indexed token, uint256 indexed chainId, address indexed requester)",
]);

