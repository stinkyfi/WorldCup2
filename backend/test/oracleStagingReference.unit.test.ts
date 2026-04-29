import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { loadStagingTeamKeysForGroup } from "../src/lib/oracleStagingReference.js";

const json = JSON.stringify([
  { groupId: 0, rankings: ["A1", "A2", "A3", "A4"] },
  { groupId: 2, rankings: ["C1", "C2", "C3", "C4"] },
]);

afterEach(() => {
  delete process.env.ORACLE_STAGING_GROUPS_JSON;
});

test("loadStagingTeamKeysForGroup returns null when env unset", () => {
  assert.equal(loadStagingTeamKeysForGroup(0), null);
});

test("loadStagingTeamKeysForGroup returns rankings for matching groupId", () => {
  process.env.ORACLE_STAGING_GROUPS_JSON = json;
  assert.deepEqual(loadStagingTeamKeysForGroup(0), ["A1", "A2", "A3", "A4"]);
  assert.deepEqual(loadStagingTeamKeysForGroup(2), ["C1", "C2", "C3", "C4"]);
  assert.equal(loadStagingTeamKeysForGroup(1), null);
});

test("loadStagingTeamKeysForGroup returns null for invalid group id", () => {
  process.env.ORACLE_STAGING_GROUPS_JSON = json;
  assert.equal(loadStagingTeamKeysForGroup(-1), null);
  assert.equal(loadStagingTeamKeysForGroup(99), null);
});
