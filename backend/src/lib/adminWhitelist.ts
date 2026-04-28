import { getAddress } from "viem";
import { prisma } from "../db.js";

/** True if `walletAddress` is whitelisted as admin for `chainId` (Story 2.3). */
export async function isWalletAdminForChain(walletAddress: string, chainId: number): Promise<boolean> {
  let addr: `0x${string}`;
  try {
    addr = getAddress(walletAddress);
  } catch {
    return false;
  }
  const row = await prisma.admin.findUnique({
    where: {
      address_chainId: {
        address: addr,
        chainId,
      },
    },
  });
  return row !== null;
}
