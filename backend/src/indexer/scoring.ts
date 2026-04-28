import { getAddress, keccak256, toBytes, type Address } from "viem";

export function teamKeyToAddress(teamKey: string): Address {
  const h = keccak256(toBytes(`wc2:${teamKey}`));
  return getAddress(`0x${h.slice(-40)}` as `0x${string}`);
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

