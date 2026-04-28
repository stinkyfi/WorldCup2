import * as Dialog from "@radix-ui/react-dialog";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Menu, X } from "lucide-react";
import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useNavDrawer } from "@/stores/navDrawerStore";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { to: "/browse", label: "Browse" },
  { to: "/my-leagues", label: "My Leagues" },
  { to: "/create", label: "Create" },
] as const;

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "rounded-md px-4 py-3 text-sm font-medium transition-colors min-h-11 inline-flex items-center",
    isActive ? "bg-background/50 text-foreground" : "text-muted-foreground hover:bg-background/40 hover:text-foreground",
  );

export function AppShell({ children }: { children: ReactNode }) {
  const open = useNavDrawer((s) => s.open);
  const setOpen = useNavDrawer((s) => s.setOpen);

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur supports-backdrop-filter:bg-surface/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2 text-lg font-semibold tracking-tight text-foreground"
          >
            <span className="font-mono text-primary">WC2</span>
            <span className="hidden sm:inline">WorldCup2</span>
          </Link>

          <nav
            className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 lg:flex"
            aria-label="Primary"
          >
            {NAV_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} className={navClass}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
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
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
                <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-[min(100%,20rem)] flex-col border-l border-border bg-surface p-4 shadow-xl outline-none">
                  <div className="mb-4 flex items-center justify-between">
                    <Dialog.Title className="text-lg font-semibold">Menu</Dialog.Title>
                    <Dialog.Close asChild>
                      <Button type="button" variant="ghost" size="icon" aria-label="Close menu">
                        <X className="size-6" aria-hidden />
                      </Button>
                    </Dialog.Close>
                  </div>
                  <Dialog.Description className="sr-only">Main site navigation</Dialog.Description>
                  <nav className="flex flex-col gap-2" aria-label="Mobile primary">
                    {NAV_LINKS.map((link) => (
                      <Dialog.Close asChild key={link.to}>
                        <NavLink
                          to={link.to}
                          className="flex min-h-11 min-w-11 items-center rounded-md px-4 py-3 text-base font-medium text-foreground hover:bg-background/50"
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
