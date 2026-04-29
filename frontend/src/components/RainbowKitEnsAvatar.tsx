import type { AvatarComponent } from "@rainbow-me/rainbowkit";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { useWalletPrimaryIdentity } from "@/hooks/useWalletPrimaryIdentity";

const absoluteFill = (size: number): CSSProperties => ({
  position: "absolute",
  top: 0,
  left: 0,
  width: size,
  height: size,
  borderRadius: 9999,
});

/**
 * RainbowKit `avatar` override: L1 ENS + Base primary name avatars (via `resolveWalletIdentity`),
 * then RainbowKit’s default `ensImage` (mainnet), then address initials.
 */
export const RainbowKitEnsAvatar: AvatarComponent = ({ address, ensImage, size }) => {
  const { avatarUrl } = useWalletPrimaryIdentity(address);
  const src = avatarUrl ?? ensImage ?? null;

  if (src) {
    return (
      <div
        style={{
          ...absoluteFill(size),
          backgroundImage: `url(${src})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center bg-gradient-to-br from-primary/30 to-muted font-mono text-accent",
      )}
      style={{
        ...absoluteFill(size),
        fontSize: Math.round(size * 0.34),
      }}
      aria-hidden
    >
      {address.slice(2, 4).toUpperCase()}
    </div>
  );
};
