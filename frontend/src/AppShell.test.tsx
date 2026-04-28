import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { Providers } from "./Providers";

function setViewportWidth(px: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: px });
  window.dispatchEvent(new Event("resize"));
}

afterEach(() => {
  setViewportWidth(1024);
});

function renderWithRouter(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("AppShell", () => {
  it("renders centred nav on large viewports and logo + connect affordance", () => {
    setViewportWidth(1280);
    renderWithRouter(
      <Providers>
        <AppShell>
          <div>child</div>
        </AppShell>
      </Providers>,
    );

    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /DegenDraft/i })).toBeInTheDocument();
    expect(screen.getByText("Browse")).toBeInTheDocument();
    expect(screen.getByText("My Leagues")).toBeInTheDocument();
    expect(screen.getByText("Create")).toBeInTheDocument();
    expect(screen.getByText("child")).toBeInTheDocument();
  });

  it("exposes a 44px mobile menu control below the lg breakpoint", () => {
    setViewportWidth(375);
    renderWithRouter(
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
