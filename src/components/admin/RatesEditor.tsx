"use client";

import { useMemo, useState } from "react";
import { formatPrice, groupByCategory, priceChange, timeAgo } from "@/lib/format";
import { UNIT_LABEL, type BoardPayload, type Rate } from "@/lib/types";
import { api } from "./api";
import { RateForm } from "./RateForm";

interface Props {
  board: BoardPayload;
  onChanged: () => Promise<void>;
  onError: (err: unknown) => void;
  onSaved: (msg: string) => void;
}

/**
 * The main admin screen: every item with a big price box. Change any prices,
 * then press "Save" on one row or "Save all" at the bottom. Screens update at once.
 */
export function RatesEditor({ board, onChanged, onError, onSaved }: Props) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [now] = useState(() => Date.now()); // for "changed x min ago"; refreshes when the list reloads

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return board.rates;
    return board.rates.filter((r) => `${r.category} ${r.brand} ${r.model} ${r.spec}`.toLowerCase().includes(q));
  }, [board.rates, search]);
  const groups = groupByCategory(filtered, board.settings.categoryOrder);
  const categories = [...new Set([...board.settings.categoryOrder, ...board.rates.map((r) => r.category)])];

  const dirtyIds = Object.keys(drafts).filter((id) => {
    const rate = board.rates.find((r) => r.id === id);
    const n = Number(drafts[id]);
    return rate && drafts[id] !== "" && Number.isFinite(n) && n >= 0 && n !== rate.price;
  });

  async function savePrices(ids: string[]) {
    if (ids.length === 0) return;
    setBusy(true);
    try {
      for (const id of ids) {
        await api(`/api/admin/rates/${id}`, { method: "PATCH", body: { price: Number(drafts[id]) } });
      }
      setDrafts((d) => {
        const copy = { ...d };
        ids.forEach((id) => delete copy[id]);
        return copy;
      });
      onSaved(ids.length === 1 ? "Price saved. Screen updated." : `${ids.length} prices saved. Screen updated.`);
      await onChanged();
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(rate: Rate, field: "active" | "inStock") {
    setBusy(true);
    try {
      await api(`/api/admin/rates/${rate.id}`, { method: "PATCH", body: { [field]: !rate[field] } });
      await onChanged();
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  }

  async function remove(rate: Rate) {
    if (!confirm(`Delete ${rate.brand} ${rate.model}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api(`/api/admin/rates/${rate.id}`, { method: "DELETE" });
      onSaved("Item deleted.");
      await onChanged();
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  }

  if (board.rates.length === 0) {
    return <p className="rounded-2xl bg-white p-6 text-muted">No items yet. Open the “Add item” tab to add the first one.</p>;
  }

  return (
    <div className="space-y-5 pb-28">
      <input
        className="input"
        placeholder="Search brand, model..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search items"
      />
      {groups.map((g) => (
        <section key={g.category}>
          <h2 className="mb-2 font-display text-lg font-extrabold">{g.category}</h2>
          <ul className="space-y-3">
            {g.rates.map((r) =>
              editing === r.id ? (
                <li key={r.id} className="rounded-2xl bg-white p-4 shadow-sm">
                  <RateForm
                    rate={r}
                    categories={categories}
                    onError={onError}
                    onCancel={() => setEditing(null)}
                    onSaved={async () => {
                      setEditing(null);
                      onSaved("Item updated.");
                      await onChanged();
                    }}
                  />
                </li>
              ) : (
                <RateCard
                  key={r.id}
                  rate={r}
                  draft={drafts[r.id]}
                  busy={busy}
                  onDraft={(v) => setDrafts((d) => ({ ...d, [r.id]: v }))}
                  onSave={() => void savePrices([r.id])}
                  onToggle={(f) => void toggle(r, f)}
                  onEdit={() => setEditing(r.id)}
                  onDelete={() => void remove(r)}
                  dirty={dirtyIds.includes(r.id)}
                  now={now}
                />
              ),
            )}
          </ul>
        </section>
      ))}

      {dirtyIds.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="mx-auto flex max-w-3xl gap-2">
            <button className="btn-ghost-dark min-h-14 flex-1" disabled={busy} onClick={() => setDrafts({})}>
              Undo
            </button>
            <button className="btn-primary min-h-14 flex-[2]" disabled={busy} onClick={() => void savePrices(dirtyIds)}>
              {busy ? "Saving..." : `Save all (${dirtyIds.length})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RateCard(props: {
  rate: Rate;
  draft: string | undefined;
  dirty: boolean;
  busy: boolean;
  onDraft: (v: string) => void;
  onSave: () => void;
  onToggle: (f: "active" | "inStock") => void;
  onEdit: () => void;
  onDelete: () => void;
  now: number;
}) {
  const { rate, draft, dirty, busy } = props;
  const change = priceChange(rate);
  const step = rate.unit === "per_watt" ? 0.5 : 100;
  const value = draft ?? String(rate.price);
  const bump = (by: number) => {
    const n = Math.max(0, Math.round(((Number(value) || 0) + by) * 100) / 100);
    props.onDraft(String(n));
  };

  return (
    <li className={`rounded-2xl bg-white p-4 shadow-sm ${rate.active ? "" : "opacity-60"} ${dirty ? "ring-2 ring-gold" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display font-extrabold">
            {rate.brand} <span className="font-semibold text-muted">{rate.model}</span>
          </p>
          <p className="text-sm text-muted">
            {[rate.spec, UNIT_LABEL[rate.unit].replace("/ ", "per "), !rate.active && "Hidden from screen", !rate.inStock && "Out of stock"]
              .filter(Boolean)
              .join(" • ")}
          </p>
          <p className="mt-1 text-xs text-muted">
            Now Rs {formatPrice(rate.price)}
            {change !== 0 && (
              <span className={change > 0 ? "text-leaf" : "text-danger"}>
                {" "}({change > 0 ? "+" : "−"}{formatPrice(Math.abs(change))})
              </span>
            )}{" "}
            · changed {timeAgo(rate.priceChangedAt, props.now)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-stretch gap-2">
        <button className="btn-step" onClick={() => bump(-step)} aria-label={`Lower by ${step}`} disabled={busy}>−</button>
        <label className="relative flex-1">
          <span className="sr-only">New price for {rate.brand} {rate.model}</span>
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-bold text-muted">Rs</span>
          <input
            inputMode="decimal"
            className="input h-14 pl-10 text-center font-display text-2xl font-extrabold tabular-nums"
            value={value}
            onChange={(e) => props.onDraft(e.target.value.replace(/[^\d.]/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && dirty && props.onSave()}
          />
        </label>
        <button className="btn-step" onClick={() => bump(step)} aria-label={`Raise by ${step}`} disabled={busy}>+</button>
        <button className="btn-primary min-h-14 px-5" disabled={!dirty || busy} onClick={props.onSave}>Save</button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <button className="btn-chip" disabled={busy} onClick={() => props.onToggle("active")}>
          {rate.active ? "Hide from screen" : "Show on screen"}
        </button>
        <button className="btn-chip" disabled={busy} onClick={() => props.onToggle("inStock")}>
          {rate.inStock ? "Mark out of stock" : "Mark in stock"}
        </button>
        <button className="btn-chip" disabled={busy} onClick={props.onEdit}>Edit</button>
        <button className="btn-chip text-danger" disabled={busy} onClick={props.onDelete}>Delete</button>
      </div>
    </li>
  );
}
