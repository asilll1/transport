import { create } from "zustand";
import type { CityKey } from "../lib/cities";

export type HomeTab = "drivers" | "passengers";

type State = {
  homeTab: HomeTab;
  filterFrom: CityKey | "";
  filterTo: CityKey | "";
  setHomeTab: (t: HomeTab) => void;
  setFilterFrom: (c: CityKey | "") => void;
  setFilterTo: (c: CityKey | "") => void;
};

export const useAppStore = create<State>((set) => ({
  homeTab: "drivers",
  filterFrom: "",
  filterTo: "",
  setHomeTab: (homeTab) => set({ homeTab }),
  setFilterFrom: (filterFrom) => set({ filterFrom }),
  setFilterTo: (filterTo) => set({ filterTo }),
}));
