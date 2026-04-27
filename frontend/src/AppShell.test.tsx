import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AppShell } from "./components/AppShell";
import { Providers } from "./Providers";

function setViewportWidth(px: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: px });
  window.dispatchEvent(new Event("resize"));
}

afterEach(() => {
  setViewportWidth(1024);
});

describe("AppShell", () => {
  it("renders centred nav on large viewports and logo + connect affordance", () => {
    setViewportWidth(1280);
    render(
      <Providers>
        <AppShell>
          <div>child</div>
        </AppShell>
      </Providers>,
    );

    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /WC2/i })).toBeInTheDocument();
    expect(screen.getByText("Browse")).toBeInTheDocument();
    expect(screen.getByText("My Leagues")).toBeInTheDocument();
    expect(screen.getByText("Create")).toBeInTheDocument();
    expect(screen.getByText("child")).toBeInTheDocument();
  });

  it("exposes a 44px mobile menu control below the lg breakpoint", () => {
    setViewportWidth(375);
    render(
      <Providers>
        <AppShell>
          <span>main</span>
        </AppShell>
      </Providers>,
    );

    const menuBtn = screen.getByRole("button", { name: /open navigation menu/i });
    expect(menuBtn.className).toMatch(/min-h-11/);
    expect(menuBtn.className).toMatch(/min-w-11|w-11/);
  });
});
