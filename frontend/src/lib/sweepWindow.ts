const SECONDS_PER_DAY = 86_400n;
const SWEEP_AFTER_DAYS = 90n;

export function isPastSweepWindow(params: { merkleRootSetAtSec: bigint; nowSec: bigint }): boolean {
  if (params.merkleRootSetAtSec <= 0n) return false;
  return params.nowSec >= params.merkleRootSetAtSec + SWEEP_AFTER_DAYS * SECONDS_PER_DAY;
}

