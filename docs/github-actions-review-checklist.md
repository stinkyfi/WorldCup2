# GitHub Actions — review & setup checklist

Save this for when you configure the repo on GitHub. It matches **Story 1.10** (`.github/workflows/ci.yml`, `deploy-staging.yml`) and the contracts **lint** script.

## CI (every PR and push to `main`)

Workflow: **`.github/workflows/ci.yml`** (workflow name: **CI**).

- **Triggers:** pull requests targeting **`main`**, and pushes to **`main`**.
- **Jobs (all must pass for a green check):**
  - **contracts** — `npm ci`, `npm run compile`, `npm run lint`, `npm test`
  - **backend** — `npm ci`, `npm run lint`, `npm test`
  - **frontend** — `npm ci`, `npm run lint`, `npm test`

### Branch protection (recommended)

In **Settings → Branches → Branch protection** for `main`:

- Require the **CI** workflow (all three jobs) before merge.

## Slither (only on push to `main`)

- Same **CI** workflow includes job **`slither-main`** after **contracts** succeeds.
- Runs **`python -m slither . --fail-high`** in `contracts/`.
- If the log shows the known **Hardhat 3 / crytic-compile** blocker (`hh3-artifact` or `KeyError: 'output'`), the job **passes** with a **notice** so `main` can stay green until tooling catches up. See **`contracts/slither-notes.md`**.
- If Slither actually analyses the code and reports **High** severity, the job **fails**.

## Staging deploy (optional)

Workflow: **`.github/workflows/deploy-staging.yml`** (name: **Deploy staging (testnets)**).

### When it runs

1. **`workflow_dispatch`** — you can run it manually from the **Actions** tab anytime (deploy job runs).
2. **Push to `main`** — deploy job runs only if the repository variable **`ENABLE_STAGING_DEPLOY`** is set to **`true`**.

### Repository variable

- **Settings → Secrets and variables → Actions → Variables**
- Create **`ENABLE_STAGING_DEPLOY`** = `true` if you want **automatic** deploy on every push to `main`.

### Secrets (Actions → Secrets)

Used by the deploy job (never echoed in the workflow; GitHub masks `secrets.*` in logs):

| Secret | Purpose |
|--------|---------|
| `DEPLOYER_KEY` | Deployer private key (0x…) |
| `ORACLE_ADDRESS` | `OracleController` oracle address |
| `DEV_WALLET_ADDRESS` | `LeagueFactory` dev wallet |
| `RPC_URL_BASE_TESTNET` | Base Sepolia RPC |
| `RPC_URL_ETHEREUM_SEPOLIA` | Ethereum Sepolia RPC |
| `RPC_URL_SONIC_TESTNET` | Sonic Blaze testnet RPC |

Deploy runs, in order:

- `npm run deploy -- --network base-testnet`
- `npm run deploy -- --network ethereum-sepolia`
- `npm run deploy -- --network sonic-testnet`

Then it commits **`contracts/deployments/*.json`** with **`[skip ci]`** in the commit message to limit follow-up workflow noise.

### Permissions

The deploy workflow uses **`permissions: contents: write`** so the default **`GITHUB_TOKEN`** can push the deployment JSON commit. Ensure your org/repo policy allows that.

## Local parity

From each package directory after `npm ci`:

```bash
cd contracts && npm run lint && npm test
cd ../backend && npm run lint && npm test
cd ../frontend && npm run lint && npm test
```

---

*Generated from Story 1.10 implementation notes (2026-04-28).*
