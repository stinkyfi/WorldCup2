import type { Address } from "viem";
import { cn } from "@/lib/utils";
import { useWalletPrimaryIdentity } from "@/hooks/useWalletPrimaryIdentity";

type Props = {
  address: Address;
  className?: string;
};

/**
 * Navbar identity: Ethereum mainnet ENS + Base primary name (via universal resolver) when resolvable;
 * otherwise truncated address.
 */
export function IdentityDisplay({ address, className }: Props) {
  const { label, avatarUrl: avatar } = useWalletPrimaryIdentity(address);

  return (
    <div className={cn("flex min-w-0 max-w-[11rem] items-center gap-2", className)}>
      {avatar ? (
        <img
          src={avatar}
          alt=""
          className="size-8 shrink-0 rounded-full border border-accent/25 bg-muted object-cover shadow-[0_0_16px_-4px_rgba(104,74,188,0.35)]"
        />
      ) : (
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-accent/20 bg-gradient-to-br from-primary/25 to-muted font-mono text-xs text-accent"
          aria-hidden
        >
          {address.slice(2, 4).toUpperCase()}
        </div>
      )}
      <span className="truncate font-mono text-sm text-foreground" title={address}>
        {label}
      </span>
    </div>
  );
}
