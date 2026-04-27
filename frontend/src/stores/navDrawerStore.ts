import { create } from "zustand";

/** Mobile nav drawer — zustand for lightweight UI state (architecture). */
export const useNavDrawer = create<{
  open: boolean;
  setOpen: (open: boolean) => void;
}>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
