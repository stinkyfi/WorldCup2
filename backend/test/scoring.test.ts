import test from "node:test";
import assert from "node:assert/strict";
import { computeGroupScore, teamKeyToAddress } from "../src/indexer/scoring.js";

test("computeGroupScore: 4/4 yields 5 points (perfect bonus)", () => {
  const groupId = 0;
  const predicted: [string, string, string, string] = ["A1", "A2", "A3", "A4"];
  const actual = predicted.map((k) => teamKeyToAddress(`group:${groupId}:${k}`)) as unknown as [
    `0x${string}`,
    `0x${string}`,
    `0x${string}`,
    `0x${string}`,
  ];
  const s = computeGroupScore({ groupId, predictedTeamKeys: predicted, actualRankings: actual });
  assert.equal(s.points, 5);
  assert.equal(s.perfectBonus, true);
});

test("computeGroupScore: 2 correct positions yields 2 points", () => {
  const groupId = 1;
  const predicted: [string, string, string, string] = ["B1", "B2", "B3", "B4"];
  const actual = [
    teamKeyToAddress(`group:${groupId}:B1`),
    teamKeyToAddress(`group:${groupId}:B3`),
    teamKeyToAddress(`group:${groupId}:B2`),
    teamKeyToAddress(`group:${groupId}:B4`),
  ] as const;
  const s = computeGroupScore({ groupId, predictedTeamKeys: predicted, actualRankings: actual });
  assert.equal(s.points, 2);
  assert.equal(s.perfectBonus, false);
});

