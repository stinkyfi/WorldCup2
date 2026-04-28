import type { AuthenticationStatus } from "@rainbow-me/rainbowkit";
import { createContext, useContext } from "react";

export type SiweAuthUi = {
  siweError: string | null;
  clearSiweError: () => void;
};

const defaultSiweAuthUi: SiweAuthUi = {
  siweError: null,
  clearSiweError: () => undefined,
};

export const SiweAuthUiContext = createContext<SiweAuthUi>(defaultSiweAuthUi);

export function useSiweAuthUi(): SiweAuthUi {
  return useContext(SiweAuthUiContext);
}

export type SiweSessionValue = { authStatus: AuthenticationStatus };

const defaultSession: SiweSessionValue = { authStatus: "loading" };

export const SiweSessionContext = createContext<SiweSessionValue>(defaultSession);

/** Mirrors RainbowKit auth status (hook not exported from the main package in RK 2.2.10). */
export function useSiweSession(): SiweSessionValue {
  return useContext(SiweSessionContext);
}
