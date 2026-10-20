import type { ThemeMode } from "./types";

export type Theme = "day" | "night";

export const DAY_STARTS_HOUR = 7;
export const NIGHT_STARTS_HOUR = 18;

/** Auto follows the screen's own clock: Day from 7 AM to 6 PM, Night otherwise. */
export function resolveTheme(mode: ThemeMode, now: Date | null): Theme {
  if (mode === "day" || mode === "night") return mode;
  if (!now) return "night";
  const h = now.getHours();
  return h >= DAY_STARTS_HOUR && h < NIGHT_STARTS_HOUR ? "day" : "night";
}

export function parseThemeMode(value: string | null | undefined): ThemeMode | null {
  return value === "auto" || value === "day" || value === "night" ? value : null;
}
