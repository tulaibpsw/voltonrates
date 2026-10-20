import type { Rate } from "./types";

export function formatPrice(n: number): string {
  return n.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function priceChange(rate: Pick<Rate, "price" | "previousPrice">): number {
  return rate.previousPrice === null ? 0 : Math.round((rate.price - rate.previousPrice) * 100) / 100;
}

export function timeAgo(iso: string | null, now: number | undefined): string {
  if (!iso || now === undefined) return "";
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

/** Group rates by category, following the admin's chosen order, then any other categories A-Z. */
export function groupByCategory(rates: Rate[], order: string[]): { category: string; rates: Rate[] }[] {
  const map = new Map<string, Rate[]>();
  for (const r of rates) {
    const list = map.get(r.category) ?? [];
    list.push(r);
    map.set(r.category, list);
  }
  const known = order.filter((c) => map.has(c));
  const rest = [...map.keys()].filter((c) => !order.includes(c)).sort();
  return [...known, ...rest].map((category) => ({ category, rates: map.get(category)! }));
}

export interface BoardLayout {
  /** Category boxes side by side (TV width). One category gets the full width. */
  columns: 1 | 2;
  /** One category with many items: split its rows into two columns inside the box. */
  splitRows: boolean;
  /** Text/row size multiplier. Few items → bigger text, so the screen is filled and readable from far. */
  scale: number;
}

const ROWS_THAT_FIT = 10; // about this many rows fit a 1080p screen at scale 1

/** Decide how to use the screen for the given categories. */
export function boardLayout(groups: { rates: unknown[] }[]): BoardLayout {
  if (groups.length === 0) return { columns: 1, splitRows: false, scale: 1 };
  if (groups.length === 1) {
    const n = groups[0].rates.length;
    const splitRows = n > 7;
    const perColumn = (splitRows ? Math.ceil(n / 2) : n) + 1; // + the category header
    return { columns: 1, splitRows, scale: clampScale(ROWS_THAT_FIT / perColumn) };
  }
  // Boxes fill the grid row by row: 1st left, 2nd right, 3rd left...
  const height = [0, 0];
  groups.forEach((g, i) => (height[i % 2] += g.rates.length + 1.2));
  return { columns: 2, splitRows: false, scale: clampScale(ROWS_THAT_FIT / Math.max(...height)) };
}

function clampScale(s: number): number {
  return Math.round(Math.min(1.9, Math.max(1, s)) * 100) / 100;
}
