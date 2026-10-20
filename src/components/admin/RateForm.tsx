"use client";

import { useState } from "react";
import { UNIT_LABEL, type Rate, type Unit } from "@/lib/types";
import { api } from "./api";

interface Props {
  rate?: Rate; // edit mode when given
  categories: string[];
  onSaved: () => void | Promise<void>;
  onError: (err: unknown) => void;
  onCancel?: () => void;
}

const NEW_CATEGORY = "__new__";

export function RateForm({ rate, categories, onSaved, onError, onCancel }: Props) {
  const [category, setCategory] = useState(rate?.category ?? categories[0] ?? NEW_CATEGORY);
  const [newCategory, setNewCategory] = useState("");
  const [brand, setBrand] = useState(rate?.brand ?? "");
  const [model, setModel] = useState(rate?.model ?? "");
  const [spec, setSpec] = useState(rate?.spec ?? "");
  const [unit, setUnit] = useState<Unit>(rate?.unit ?? "per_watt");
  const [price, setPrice] = useState(rate ? String(rate.price) : "");
  const [sortOrder, setSortOrder] = useState(String(rate?.sortOrder ?? 0));
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const body = {
      category: category === NEW_CATEGORY ? newCategory : category,
      brand,
      model,
      spec,
      unit,
      price: Number(price),
      sortOrder: Number(sortOrder) || 0,
    };
    try {
      if (rate) await api(`/api/admin/rates/${rate.id}`, { method: "PATCH", body });
      else await api("/api/admin/rates", { method: "POST", body });
      await onSaved();
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className={`space-y-4 ${rate ? "" : "rounded-2xl bg-surface p-5 shadow-sm"}`}>
      {!rate && <h2 className="font-display text-xl font-extrabold">Add a new item</h2>}

      <label className="block">
        <span className="label">Category</span>
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
          <option value={NEW_CATEGORY}>+ New category</option>
        </select>
      </label>
      {category === NEW_CATEGORY && (
        <label className="block">
          <span className="label">New category name</span>
          <input className="input" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} required placeholder="e.g. Solar Panels" />
        </label>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">Brand</span>
          <input className="input" value={brand} onChange={(e) => setBrand(e.target.value)} required placeholder="e.g. Jinko" />
        </label>
        <label className="block">
          <span className="label">Model (optional)</span>
          <input className="input" value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. Tiger Neo" />
        </label>
        <label className="block">
          <span className="label">Size / spec (optional)</span>
          <input className="input" value={spec} onChange={(e) => setSpec(e.target.value)} placeholder="e.g. 585W N-Type" />
        </label>
        <label className="block">
          <span className="label">Price is</span>
          <select className="input" value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
            {(Object.keys(UNIT_LABEL) as Unit[]).map((u) => (
              <option key={u} value={u}>{UNIT_LABEL[u].replace("/ ", "per ")}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Price (Rs)</span>
          <input
            className="input font-display text-xl font-bold"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))}
            required
            placeholder="e.g. 32"
          />
        </label>
        <label className="block">
          <span className="label">Position in list (smaller = higher)</span>
          <input className="input" inputMode="numeric" value={sortOrder} onChange={(e) => setSortOrder(e.target.value.replace(/\D/g, ""))} />
        </label>
      </div>

      <div className="flex gap-2">
        {onCancel && (
          <button type="button" className="btn-ghost-dark min-h-14 flex-1" onClick={onCancel}>Cancel</button>
        )}
        <button className="btn-primary min-h-14 flex-[2]" disabled={busy}>
          {busy ? "Saving..." : rate ? "Save changes" : "Add item"}
        </button>
      </div>
    </form>
  );
}
