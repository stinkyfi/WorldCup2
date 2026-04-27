/**
 * Story 1.6 — Enforce ≥90% Solidity **line** coverage on production contracts
 * (excludes mocks). Hardhat 3 coverage output does not include branch % in lcov;
 * branch goals are tracked separately (Slither / manual review).
 */
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const MIN_LINE = 90;
const CONTRACTS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const REQUIRED = [
  { pattern: /contracts[\\/]League\.sol$/i, name: "League.sol" },
  { pattern: /contracts[\\/]LeagueFactory\.sol$/i, name: "LeagueFactory.sol" },
  { pattern: /contracts[\\/]OracleController\.sol$/i, name: "OracleController.sol" },
  { pattern: /contracts[\\/]WhitelistRegistry\.sol$/i, name: "WhitelistRegistry.sol" },
];

const stdout = execSync("npx hardhat test --coverage", {
  cwd: CONTRACTS_DIR,
  encoding: "utf8",
  maxBuffer: 32 * 1024 * 1024,
  stdio: ["ignore", "pipe", "pipe"],
});

const rows = [];
for (const line of stdout.split("\n")) {
  const m = line.match(/║\s*(\S[^\s│]*\.sol)\s*│\s*(\d+\.\d+)/);
  if (m) {
    rows.push({ file: m[1].trim(), pct: Number.parseFloat(m[2]) });
  }
}

let failed = false;
for (const req of REQUIRED) {
  const hit = rows.find((r) => req.pattern.test(r.file.replace(/\//g, "\\")));
  if (!hit) {
    console.error(`check-coverage: no row for ${req.name}`);
    failed = true;
    continue;
  }
  if (hit.pct < MIN_LINE) {
    console.error(`check-coverage: ${hit.file} line ${hit.pct}% < ${MIN_LINE}%`);
    failed = true;
  } else {
    console.log(`check-coverage: OK ${hit.file} ${hit.pct}%`);
  }
}

if (failed) {
  process.exit(1);
}
