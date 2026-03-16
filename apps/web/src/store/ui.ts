import { create } from "zustand";

interface ContextPanelState {
  open: boolean;
  title: string;
  description: string;
  meta: string[];
}

interface UIState {
  selectedCompetitorId: string | null;
  globalSearch: string;
  filtersOpen: boolean;
  commandPaletteOpen: boolean;
  contextPanel: ContextPanelState;
  setSelectedCompetitorId: (value: string | null) => void;
  setGlobalSearch: (value: string) => void;
  setFiltersOpen: (value: boolean) => void;
  setCommandPaletteOpen: (value: boolean) => void;
  openContextPanel: (payload: Omit<ContextPanelState, "open">) => void;
  closeContextPanel: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedCompetitorId: "linear",
  globalSearch: "",
  filtersOpen: false,
  commandPaletteOpen: false,
  contextPanel: {
    open: false,
    title: "",
    description: "",
    meta: [],
  },
  setSelectedCompetitorId: (value) => set({ selectedCompetitorId: value }),
  setGlobalSearch: (value) => set({ globalSearch: value }),
  setFiltersOpen: (value) => set({ filtersOpen: value }),
  setCommandPaletteOpen: (value) => set({ commandPaletteOpen: value }),
  openContextPanel: (payload) => set({ contextPanel: { open: true, ...payload } }),
  closeContextPanel: () =>
    set({
      contextPanel: {
        open: false,
        title: "",
        description: "",
        meta: [],
      },
    }),
}));
