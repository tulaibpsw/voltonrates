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
