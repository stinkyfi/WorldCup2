/**
 * Runs `python -m slither .` from contracts/. Tries common Python launchers.
 * Fails with instructions if crytic-compile cannot read Hardhat 3 artifacts (see slither-notes.md).
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Prefer `python` on Windows where `py`/`python3` may be Store shims. */
const candidates = [
  ["python", "-m", "slither", "."],
  ["python3", "-m", "slither", "."],
  ["py", "-3", "-m", "slither", "."],
];

function looksLikeMissingPython(stderr, stdout, status) {
  const t = `${stderr ?? ""}${stdout ?? ""}`;
  if (/not found|No Python|Microsoft Store|cannot find|No such file/i.test(t)) return true;
  if (status === 127 || status === 9009) return true;
  return false;
}

let lastRealFailure = null;

for (const args of candidates) {
  const r = spawnSync(args[0], args.slice(1), {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (r.error?.code === "ENOENT") {
    continue;
  }
  if (r.status === 0) {
    process.stdout.write(r.stdout ?? "");
    process.exit(0);
  }
  if (looksLikeMissingPython(r.stderr ?? "", r.stdout ?? "", r.status ?? 1)) {
    continue;
  }
  lastRealFailure = r;
  break;
}

if (lastRealFailure) {
  process.stderr.write(lastRealFailure.stderr ?? "");
  process.stdout.write(lastRealFailure.stdout ?? "");
  console.error("\nSlither failed. See contracts/slither-notes.md (Hardhat 3 / crytic-compile).");
  process.exit(lastRealFailure.status ?? 1);
}

console.error("No working Python interpreter found (tried python, python3, py -3). Install Python 3 + pip install slither-analyzer.");
process.exit(127);
