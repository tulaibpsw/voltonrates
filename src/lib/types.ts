export type Unit = "per_watt" | "per_piece" | "per_set" | "per_kw";

export const UNIT_LABEL: Record<Unit, string> = {
  per_watt: "/ watt",
  per_piece: "/ piece",
  per_set: "/ set",
  per_kw: "/ kW",
};

export const DEFAULT_CATEGORIES = ["Solar Panels", "Inverters", "Batteries", "Structure & Cables"];

/** A rate as sent to the browser (ids and dates are strings). */
export interface Rate {
  id: string;
  category: string;
  brand: string;
  model: string;
  spec: string; // e.g. "585W N-Type"
  unit: Unit;
  price: number;
  previousPrice: number | null;
  priceChangedAt: string | null;
  inStock: boolean;
  active: boolean;
  sortOrder: number;
  updatedAt: string;
}

export type ThemeMode = "auto" | "day" | "night";

export interface BoardSettings {
  theme: ThemeMode; // auto = Day 7 AM–6 PM, Night otherwise (the TV's own clock)
  title: string;
  subtitle: string;
  ticker: string;
  categoryOrder: string[];
}

export interface BoardPayload {
  rates: Rate[];
  settings: BoardSettings;
  version: number; // bumps on every change, used by screens to skip duplicate refreshes
  serverTime: string;
}
