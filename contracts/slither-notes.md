# Slither notes (Story 1.6)

## Tooling status (2026-04-27)

`python -m slither .` in `contracts/` currently **fails during compilation** with:

`KeyError: 'output'` inside `crytic_compile.platform.hardhat` when parsing Hardhat **3.x** build artifacts (`_format: "hh3-artifact-1"`). Crytic-compile expects an older Hardhat artifact layout.

### Impact

- Automated Slither detectors do not run in CI until crytic-compile adds HH3 support (or the project adds a secondary compile path Slither understands).
- **No Slither-reported high or medium findings** are available from this pipeline for the current layout.

### Mitigations in this repo

- `npm run slither` tries **`python`**, then **`python3`**, then **`py -3`**, skipping obvious “interpreter missing” stubs when possible.
- Full **`npm test`** suite (Hardhat 3 + viem + `node:test`) including Story 1.6 re-entrancy probes on `League.claimPrize` / `claimRefund` via `MaliciousReentrantERC20`.
- **`npm run check:coverage`** enforces ≥90% **line** coverage on `League`, `LeagueFactory`, `OracleController`, and `WhitelistRegistry` (mocks excluded).

### When Slither works again

Re-run `npm run slither`. Document any **medium** (or higher) findings below with file, detector, and justification or fix link.

---

_(No medium findings — Slither not yet runnable on HH3 artifacts.)_
