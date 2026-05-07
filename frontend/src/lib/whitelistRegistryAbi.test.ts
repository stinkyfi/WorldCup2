import { describe, expect, it } from "vitest";
import { whitelistRegistryAbi } from "./whitelistRegistryAbi";

describe("whitelistRegistryAbi", () => {
  it("includes getWhitelistedTokens and removeToken for admin de-whitelist (Story 9.4)", () => {
    const items = whitelistRegistryAbi as { type?: string; name?: string }[];
    const fnNames = items.filter((x) => x.type === "function").map((x) => x.name).filter(Boolean);
    expect(fnNames).toContain("getWhitelistedTokens");
    expect(fnNames).toContain("removeToken");
  });
});
