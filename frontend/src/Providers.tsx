import type { ReactNode } from "react";
import { SiweAuthProviders } from "@/components/SiweAuthProviders";

/** Wagmi + RainbowKit + SIWE session (Story 2.2). */
export function Providers({ children }: { children: ReactNode }) {
  return <SiweAuthProviders>{children}</SiweAuthProviders>;
}
