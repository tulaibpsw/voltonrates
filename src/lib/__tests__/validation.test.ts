import { describe, expect, it } from "vitest";
import { rateCreateSchema, rateUpdateSchema } from "../validation";

describe("rateUpdateSchema", () => {
  it("keeps only the fields that were sent (no defaults that would wipe data)", () => {
    expect(rateUpdateSchema.parse({ price: "34.5" })).toEqual({ price: 34.5 });
  });
  it("rejects a negative price", () => {
    expect(rateUpdateSchema.safeParse({ price: -1 }).success).toBe(false);
  });
});

describe("rateCreateSchema", () => {
  it("fills defaults for a new item", () => {
    expect(rateCreateSchema.parse({ category: "Solar Panels", brand: "Jinko", price: 32 })).toMatchObject({
      model: "",
      spec: "",
      unit: "per_watt",
      inStock: true,
      active: true,
      sortOrder: 0,
    });
  });
  it("requires a brand", () => {
    expect(rateCreateSchema.safeParse({ category: "Solar Panels", brand: " ", price: 32 }).success).toBe(false);
  });
});
