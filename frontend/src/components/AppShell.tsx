import * as Dialog from "@radix-ui/react-dialog";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Menu, X } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAccount } from "wagmi";
import { IdentityDisplay } from "@/components/IdentityDisplay";
import { useSiweAuthUi, useSiweSession } from "@/lib/siweAuthContext";
import { Button } from "@/components/ui/button";
import { useNavDrawer } from "@/stores/navDrawerStore";
import { cn } from "@/lib/utils";

const BASE_NAV_LINKS = [
  { to: "/browse", label: "Browse" },
  { to: "/my-leagues", label: "My Leagues" },
  { to: "/create", label: "Create" },
] as const;

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "rounded-lg px-4 py-3 text-sm font-semibold transition-all duration-200 min-h-11 inline-flex items-center",
    isActive
      ? "bg-primary/20 text-accent shadow-[inset_0_0_0_1px_rgba(10,238,235,0.25)]"
      : "text-muted-foreground hover:bg-accent/[0.06] hover:text-foreground",
  );

export function AppShell({ children }: { children: ReactNode }) {
  const open = useNavDrawer((s) => s.open);
  const setOpen = useNavDrawer((s) => s.setOpen);
  const { address } = useAccount();
  const { authStatus, me } = useSiweSession();
  const navLinks = useMemo(() => {
    if (me?.isAdmin) {
      return [...BASE_NAV_LINKS, { to: "/admin" as const, label: "Admin" }];
    }
    return [...BASE_NAV_LINKS];
  }, [me?.isAdmin]);
  const { siweError, clearSiweError } = useSiweAuthUi();

  return (
    <div className="flex min-h-screen flex-col bg-transparent font-sans text-foreground">
      {siweError ? (
        <div
          className="border-b border-destructive/40 bg-destructive/10 px-4 py-2 text-center text-sm text-destructive"
          role="alert"
        >
          <span>{siweError}</span>{" "}
          <button type="button" className="underline underline-offset-2" onClick={() => clearSiweError()}>
            Dismiss
          </button>
        </div>
      ) : null}
      <header className="sticky top-0 z-40 border-b border-accent/15 bg-surface/90 shadow-[0_12px_40px_-20px_rgba(0,0,0,0.55)] backdrop-blur-md supports-backdrop-filter:bg-surface/75">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link
            to="/"
            aria-label="DegenDraft home"
            className="flex shrink-0 items-center gap-2 text-lg font-semibold tracking-tight text-foreground transition-opacity hover:opacity-95"
          >
            <img
              src="/DegenDraft.png"
              alt=""
              width={176}
              height={40}
              decoding="async"
              className="h-9 w-auto max-h-10 max-w-[min(100%,11rem)] object-contain object-left drop-shadow-[0_0_12px_rgba(104,74,188,0.35)] sm:h-10 sm:max-h-11 sm:max-w-52"
            />
          </Link>

          <nav
            className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 lg:flex"
            aria-label="Primary"
          >
            {navLinks.map((link) => (
              <NavLink key={link.to} to={link.to} className={navClass}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex min-w-0 items-center gap-2">
            {authStatus === "authenticated" && address ? (
              <IdentityDisplay address={address} className="hidden sm:flex" />
            ) : null}
            <ConnectButton chainStatus="icon" showBalance={{ smallScreen: false, largeScreen: true }} />
            <Dialog.Root open={open} onOpenChange={setOpen}>
              <Dialog.Trigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Open navigation menu"
                >
                  <Menu className="size-6" aria-hidden />
                </Button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
                <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-[min(100%,20rem)] flex-col border-l border-accent/20 bg-surface/98 p-4 shadow-[0_0_60px_-12px_rgba(104,74,188,0.45)] outline-none backdrop-blur-xl">
                  <div className="mb-4 flex items-center justify-between">
                    <Dialog.Title className="font-display text-lg font-semibold tracking-tight">Menu</Dialog.Title>
                    <Dialog.Close asChild>
                      <Button type="button" variant="ghost" size="icon" aria-label="Close menu">
                        <X className="size-6" aria-hidden />
                      </Button>
                    </Dialog.Close>
                  </div>
                  <Dialog.Description className="sr-only">Main site navigation</Dialog.Description>
                  <nav className="flex flex-col gap-2" aria-label="Mobile primary">
                    {navLinks.map((link) => (
                      <Dialog.Close asChild key={link.to}>
                        <NavLink
                          to={link.to}
                          className="flex min-h-11 min-w-11 items-center rounded-lg px-4 py-3 text-base font-medium text-foreground transition-colors hover:bg-primary/15 hover:text-accent"
                        >
                          {link.label}
                        </NavLink>
                      </Dialog.Close>
                    ))}
                  </nav>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
