import { parseAbi } from "viem";

export const whitelistRegistryAbi = parseAbi([
  "function isWhitelisted(address token) view returns (bool)",
  "function getWhitelistedTokens() view returns (address[])",
  "function requestFeeToken() view returns (address)",
  "function requestFeeAmount() view returns (uint256)",
  "function requestWhitelist(address token)",
  "function requestCount() view returns (uint256)",
  "function requests(uint256 requestId) view returns (address token, address requester, uint64 requestedAt, uint8 status, uint256 feeEscrowed)",
  "function approveRequest(uint256 requestId)",
  "function rejectRequest(uint256 requestId)",
  "function approveToken(address token)",
  "function removeToken(address token)",
  "function upvotes(uint256 requestId) view returns (uint256)",
  "function downvotes(uint256 requestId) view returns (uint256)",
  "function voteOf(uint256 requestId, address voter) view returns (uint8)",
  "function vote(uint256 requestId, bool isUpvote)",
  "event WhitelistRequested(address indexed token, uint256 indexed chainId, address indexed requester)",
  "event WhitelistVoted(uint256 indexed requestId, address indexed voter, bool isUpvote)",
  "event TokenRejected(uint256 indexed requestId, address indexed token, address indexed requester, uint256 refundAmount)",
  "event TokenApproved(address indexed token)",
  "event TokenRemoved(address indexed token)",
]);

