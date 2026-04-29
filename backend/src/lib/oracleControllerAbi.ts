import { parseAbi, parseAbiItem } from "viem";

export const oracleControllerAbi = parseAbi([
  "function hasResultsPosted(uint8 groupId) view returns (bool)",
  "function expectedDeadline(uint8 groupId) view returns (uint256)",
  "function getResults(uint8 groupId) view returns (address[4])",
  "function postResults(uint8 groupId, address[4] rankings)",
  "function setResultsForTesting(uint8 groupId, address[4] rankings)",
  "function overrideResults(uint8 groupId, address[4] rankings)",
  "event ResultsPosted(uint8 indexed groupId, address[4] rankings)",
  "event ResultsOverridden(uint8 indexed groupId, address[4] rankings)",
]);

/** Indexer listens to both oracle post and admin override (Epic 7) — same scoring path. */
export const oracleResultsEvents = [
  parseAbiItem("event ResultsPosted(uint8 indexed groupId, address[4] rankings)"),
  parseAbiItem("event ResultsOverridden(uint8 indexed groupId, address[4] rankings)"),
];

