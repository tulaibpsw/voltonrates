import { describe, expect, it } from "vitest";
import { groupByCategory, priceChange, timeAgo } from "../format";
import type { Rate } from "../types";

const rate = (category: string, id: string): Rate => ({
  id, category, brand: "B", model: "", spec: "", unit: "per_watt", price: 1, previousPrice: null,
  priceChangedAt: null, inStock: true, active: true, sortOrder: 0, updatedAt: "2026-01-01T00:00:00Z",
});

describe("format", () => {
  it("computes price change, rounded to 2 decimals", () => {
    expect(priceChange({ price: 32.1, previousPrice: 30 })).toBe(2.1);
    expect(priceChange({ price: 32, previousPrice: null })).toBe(0);
  });
  it("groups by the admin's order, then the rest A-Z", () => {
    const groups = groupByCategory([rate("Z", "1"), rate("Inverters", "2"), rate("Solar Panels", "3"), rate("A", "4")], ["Solar Panels", "Inverters"]);
    expect(groups.map((g) => g.category)).toEqual(["Solar Panels", "Inverters", "A", "Z"]);
  });
  it("says how long ago", () => {
    const now = Date.parse("2026-01-01T02:00:00Z");
    expect(timeAgo("2026-01-01T01:59:30Z", now)).toBe("just now");
    expect(timeAgo("2026-01-01T01:30:00Z", now)).toBe("30 min ago");
    expect(timeAgo(null, now)).toBe("");
  });
});

import { resolveTheme } from "../theme";
describe("resolveTheme", () => {
  it("auto is Day from 7 AM to 6 PM, Night otherwise", () => {
    expect(resolveTheme("auto", new Date(2026, 0, 1, 7, 0))).toBe("day");
    expect(resolveTheme("auto", new Date(2026, 0, 1, 17, 59))).toBe("day");
    expect(resolveTheme("auto", new Date(2026, 0, 1, 18, 0))).toBe("night");
    expect(resolveTheme("auto", new Date(2026, 0, 1, 2, 0))).toBe("night");
  });
  it("a fixed choice wins", () => {
    expect(resolveTheme("day", new Date(2026, 0, 1, 23, 0))).toBe("day");
  });
});
