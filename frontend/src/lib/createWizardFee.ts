import { formatUnits, parseUnits } from "viem";

export type WizardToken = { symbol: string; decimals: number; minEntryWei: string };

export function parseEntryFeeWei(
  input: string,
  decimals: number,
): { ok: true; wei: bigint } | { ok: false; message: string } {
  const t = input.trim();
  if (t === "") return { ok: false, message: "Enter an entry fee." };
  try {
    const wei = parseUnits(t, decimals);
    return { ok: true, wei };
  } catch {
    return { ok: false, message: "Enter a valid token amount (check decimals)." };
  }
}

/** `null` if fee meets or exceeds platform minimum for this token. */
export function entryFeeMinimumError(wei: bigint, token: WizardToken): string | null {
  const min = BigInt(token.minEntryWei);
  if (wei >= min) return null;
  const minDisplay = formatUnits(min, token.decimals);
  return `Minimum entry fee is ${minDisplay} ${token.symbol}.`;
}

export function parsePositiveInt(
  label: string,
  raw: string,
  opts: { required: boolean },
): { ok: true; value: number | undefined } | { ok: false; message: string } {
  const t = raw.trim();
  if (t === "") {
    if (opts.required) return { ok: false, message: `${label} is required.` };
    return { ok: true, value: undefined };
  }
  if (!/^\d+$/.test(t)) {
    return { ok: false, message: `${label} must be a positive whole number.` };
  }
  const n = Number(t);
  if (!Number.isSafeInteger(n) || n <= 0) {
    return { ok: false, message: `${label} must be a positive whole number.` };
  }
  return { ok: true, value: n };
}
