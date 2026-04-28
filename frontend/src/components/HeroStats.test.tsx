import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HeroStats } from "./HeroStats";

describe("HeroStats", () => {
  it("shows skeletons while loading", () => {
    render(<HeroStats data={undefined} isLoading isError={false} />);
    expect(screen.getByLabelText(/Total value locked loading/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Active leagues loading/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Total players loading/i)).toBeInTheDocument();
  });

  it("renders numeric stats when data is present", () => {
    render(
      <HeroStats
        data={{
          data: { totalValueLockedWei: "0", activeLeagues: 3, totalPlayerCount: 12 },
          meta: { lastUpdatedAt: "2026-01-01T00:00:00.000Z" },
        }}
        isLoading={false}
        isError={false}
      />,
    );
    expect(screen.getByLabelText("Active leagues")).toHaveTextContent("3");
    expect(screen.getByLabelText("Total players")).toHaveTextContent("12");
    expect(screen.getByLabelText("Total value locked")).toHaveTextContent("ETH");
  });

  it("shows error state", () => {
    render(<HeroStats data={undefined} isLoading={false} isError />);
    expect(screen.getByRole("alert")).toHaveTextContent(/Could not load platform stats/i);
  });
});
