import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWalletPrimaryIdentity } from "@/hooks/useWalletPrimaryIdentity";
import { cn } from "@/lib/utils";

function ConnectedAccountTrigger({
  address,
  openAccountModal,
}: {
  address: string;
  openAccountModal: () => void;
}) {
  const { label, avatarUrl } = useWalletPrimaryIdentity(address);

  return (
    <Button
      type="button"
      variant="secondary"
      className="h-11 min-h-11 gap-2 px-2 font-semibold sm:px-3"
      onClick={openAccountModal}
      aria-haspopup="dialog"
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="size-8 shrink-0 rounded-full border border-accent/20 object-cover"
          width={32}
          height={32}
          decoding="async"
        />
      ) : (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-accent/15 bg-gradient-to-br from-primary/25 to-muted font-mono text-xs text-accent">
          {address.slice(2, 4).toUpperCase()}
        </div>
      )}
      <span className="max-w-24 truncate sm:max-w-40" title={label}>
        {label}
      </span>
      <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
    </Button>
  );
}

type Props = {
  connectLabel?: string;
  className?: string;
};

/**
 * Wallet control with ENS + Base primary names in the account affordance (RainbowKit modals unchanged).
 */
export function ConnectWalletButton({ connectLabel = "Connect Wallet", className }: Props = {}) {
  return (
    <div className={cn("flex shrink-0", className)}>
      <ConnectButton.Custom>
        {({ account, mounted, authenticationStatus, openConnectModal, openAccountModal }) => {
          const ready = mounted && authenticationStatus !== "loading";
          if (!ready) {
            return <div className="h-11 w-36 animate-pulse rounded-lg bg-muted/40" aria-hidden />;
          }
          if (!account) {
            return (
              <Button
                type="button"
                className="min-h-11 bg-gradient-to-br from-[#5a3cb8] via-primary to-[#8b6ae6] px-4 text-primary-foreground shadow-[0_0_36px_-10px_rgba(104,74,188,0.85)] hover:brightness-110"
                onClick={openConnectModal}
              >
                {connectLabel}
              </Button>
            );
          }
          return <ConnectedAccountTrigger address={account.address} openAccountModal={openAccountModal} />;
        }}
      </ConnectButton.Custom>
    </div>
  );
}
