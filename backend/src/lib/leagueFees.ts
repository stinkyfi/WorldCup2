export type FeeBreakdown = {
  prizePoolBps: number;
  creatorFeeBps: number;
  devFeeBps: number;
  prizePoolAmountWei: string;
  creatorFeeAmountWei: string;
  devFeeAmountWei: string;
};

const BPS_SCALE = 10_000n;

/**
 * Split one entry fee into dev / creator / prize pool using basis points.
 * When dev + creator bps exceed 10_000, both are scaled down proportionally so
 * fee amounts never exceed the entry fee and the remainder is never negative.
 */
export function computeFeeBreakdown(input: {
  entryFeeWei: bigint;
  creatorFeeBps: number;
  devFeeBps: number;
}): FeeBreakdown {
  const dRaw = clampBps(input.devFeeBps);
  const cRaw = clampBps(input.creatorFeeBps);
  const dB = BigInt(dRaw);
  const cB = BigInt(cRaw);
  const sumB = dB + cB;

  let dEffB: bigint;
  let cEffB: bigint;
  if (sumB === 0n) {
    dEffB = 0n;
    cEffB = 0n;
  } else if (sumB <= BPS_SCALE) {
    dEffB = dB;
    cEffB = cB;
  } else {
    dEffB = (dB * BPS_SCALE) / sumB;
    cEffB = BPS_SCALE - dEffB;
  }

  const prizeBpsB = BPS_SCALE - dEffB - cEffB;

  const devFeeAmount = (input.entryFeeWei * dEffB) / BPS_SCALE;
  const creatorFeeAmount = (input.entryFeeWei * cEffB) / BPS_SCALE;
  const prizePoolAmount = input.entryFeeWei - devFeeAmount - creatorFeeAmount;

  return {
    prizePoolBps: Number(prizeBpsB),
    creatorFeeBps: Number(cEffB),
    devFeeBps: Number(dEffB),
    prizePoolAmountWei: prizePoolAmount.toString(),
    creatorFeeAmountWei: creatorFeeAmount.toString(),
    devFeeAmountWei: devFeeAmount.toString(),
  };
}

function clampBps(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 10_000) return 10_000;
  return Math.trunc(n);
}
