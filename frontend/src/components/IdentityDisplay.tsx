import { useEffect, useState } from "react";
import { createPublicClient, http, type Address } from "viem";
import { mainnet } from "viem/chains";
import { cn } from "@/lib/utils";

const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

type Props = {
  address: Address;
  className?: string;
};

/**
 * FR3: Ethereum mainnet ENS name + avatar when resolvable; otherwise truncated address.
 * Basename (Base) / SNS (Sonic) can extend when resolvers are added to the app config.
 */
export function IdentityDisplay({ address, className }: Props) {
  const [label, setLabel] = useState(() => shortAddress(address));
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const name = await mainnetClient.getEnsName({ address });
        if (cancelled) return;
        if (name) {
          setLabel(name);
          const av = await mainnetClient.getEnsAvatar({ name });
          if (!cancelled) setAvatar(av);
        } else {
          setLabel(shortAddress(address));
          setAvatar(null);
        }
      } catch {
        if (!cancelled) {
          setLabel(shortAddress(address));
          setAvatar(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address]);

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
