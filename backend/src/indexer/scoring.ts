import { getAddress, keccak256, toBytes, type Address } from "viem";
import { groupLetterFromId, teamKeysForGroupLetter } from "../lib/worldCupGroups.js";

export function teamKeyToAddress(teamKey: string): Address {
  const h = keccak256(toBytes(`dd:${teamKey}`));
  return getAddress(`0x${h.slice(-40)}` as `0x${string}`);
}

export function addressToTeamKey(params: { groupId: number; address: Address }): string | null {
  const letter = groupLetterFromId(params.groupId);
  if (!letter) return null;
  const keys = teamKeysForGroupLetter(letter);
  for (const k of keys) {
    const a = teamKeyToAddress(`group:${params.groupId}:${k}`);
    if (a.toLowerCase() === params.address.toLowerCase()) return k;
  }
  return null;
}

export function computeGroupScore(params: {
  groupId: number;
  predictedTeamKeys: [string, string, string, string];
  actualRankings: readonly [Address, Address, Address, Address];
}): { points: number; perfectBonus: boolean } {
  const { groupId, predictedTeamKeys, actualRankings } = params;
  const predictedAddresses = predictedTeamKeys.map((k) => teamKeyToAddress(`group:${groupId}:${k}`)) as [
    Address,
    Address,
    Address,
    Address,
  ];

  let matches = 0;
  for (let i = 0; i < 4; i++) {
    if (predictedAddresses[i].toLowerCase() === actualRankings[i].toLowerCase()) matches++;
  }
  const perfectBonus = matches === 4;
  return { points: matches + (perfectBonus ? 1 : 0), perfectBonus };
}

