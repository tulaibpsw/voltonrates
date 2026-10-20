import { z } from "zod";

const unit = z.enum(["per_watt", "per_piece", "per_set", "per_kw"]);
const price = z.coerce.number().finite().min(0).max(100_000_000);

const rateFields = {
  category: z.string().trim().min(1).max(60),
  brand: z.string().trim().min(1).max(60),
  model: z.string().trim().max(80),
  spec: z.string().trim().max(80),
  unit,
  price,
  inStock: z.boolean(),
  active: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(100_000),
};

export const rateCreateSchema = z.object({
  ...rateFields,
  model: rateFields.model.default(""),
  spec: rateFields.spec.default(""),
  unit: unit.default("per_watt"),
  inStock: rateFields.inStock.default(true),
  active: rateFields.active.default(true),
  sortOrder: rateFields.sortOrder.default(0),
});

// No defaults here: a PATCH that only sends { price } must leave every other field alone.
export const rateUpdateSchema = z.object(rateFields).partial();

export const settingsSchema = z.object({
  title: z.string().trim().min(1).max(80),
  subtitle: z.string().trim().max(120).default(""),
  ticker: z.string().trim().max(500).default(""),
  categoryOrder: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
});

export const loginSchema = z.object({ password: z.string().min(1).max(200) });
