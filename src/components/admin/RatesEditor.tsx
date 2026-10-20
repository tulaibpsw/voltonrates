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

  /** Hide or show a whole category on the screen (e.g. show only Solar Panels). */
  async function setCategoryVisible(category: string, active: boolean) {
    const targets = board.rates.filter((r) => r.category === category && r.active !== active);
    if (targets.length === 0) return;
    setBusy(true);
    try {
      for (const r of targets) await api(`/api/admin/rates/${r.id}`, { method: "PATCH", body: { active } });
      onSaved(active ? `${category} is on the screen.` : `${category} is hidden from the screen.`);
      await onChanged();
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  }

  async function deleteAll() {
    setBusy(true);
    try {
      const res = await api<{ deleted: number }>("/api/admin/rates", { method: "DELETE", body: { confirm: "DELETE ALL" } });
      setDrafts({});
      onSaved(`All ${res.deleted} items deleted.`);
      await onChanged();
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  }

  if (board.rates.length === 0) {
    return <p className="rounded-2xl bg-surface p-6 text-fg-soft">No items yet. Open the “Add” tab to add the first one.</p>;
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
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-extrabold">{g.category}</h2>
            {g.rates.some((r) => r.active) ? (
              <button className="btn-chip text-sm" disabled={busy} onClick={() => void setCategoryVisible(g.category, false)}>
                Hide category from screen
              </button>
            ) : (
              <button className="btn-chip text-sm" disabled={busy} onClick={() => void setCategoryVisible(g.category, true)}>
                Show category on screen
              </button>
            )}
          </div>
          <ul className="space-y-3">
            {g.rates.map((r) =>
              editing === r.id ? (
                <li key={r.id} className="rounded-2xl bg-surface p-4 shadow-sm">
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

      <DeleteAll count={board.rates.length} busy={busy} onConfirm={() => void deleteAll()} />

      {dirtyIds.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-edge bg-surface p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-brand">
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

/** Two steps so it can't happen by a slip of the thumb: open, then type DELETE ALL. */
function DeleteAll({ count, busy, onConfirm }: { count: number; busy: boolean; onConfirm: () => void }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  if (!open) {
    return (
      <button className="btn-chip mt-6 w-full text-down" disabled={busy} onClick={() => setOpen(true)}>
        Delete all {count} items…
      </button>
    );
  }
  return (
    <div className="mt-6 space-y-3 rounded-2xl border-2 border-down bg-down-soft p-4">
      <p className="font-display font-extrabold text-down">Delete all {count} items and their price history?</p>
      <p className="text-sm">This cannot be undone. Screen settings and notices are kept. Type <b>DELETE ALL</b> to confirm.</p>
      <input className="input" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="DELETE ALL" autoCapitalize="characters" aria-label="Type DELETE ALL to confirm" />
      <div className="flex gap-2">
        <button className="btn-ghost-dark min-h-14 flex-1" onClick={() => { setOpen(false); setTyped(""); }}>
          Cancel
        </button>
        <button
          className="min-h-14 flex-[2] rounded-xl bg-down font-display font-extrabold text-white disabled:opacity-40"
          disabled={busy || typed.trim().toUpperCase() !== "DELETE ALL"}
          onClick={onConfirm}
        >
          Delete everything
        </button>
      </div>
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
    <li className={`rounded-2xl bg-surface p-4 shadow-sm ${rate.active ? "" : "opacity-60"} ${dirty ? "ring-2 ring-gold" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display font-extrabold">
            {rate.brand} <span className="font-semibold text-fg-soft">{rate.model}</span>
          </p>
          <p className="text-sm text-fg-soft">
            {[rate.spec, UNIT_LABEL[rate.unit].replace("/ ", "per "), !rate.active && "Hidden from screen", !rate.inStock && "Out of stock"]
              .filter(Boolean)
              .join(" • ")}
          </p>
          <p className="mt-1 text-xs text-fg-soft">
            Now Rs {formatPrice(rate.price)}
            {change !== 0 && (
              <span className={change > 0 ? "text-up" : "text-down"}>
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
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-bold text-fg-soft">Rs</span>
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
        <button className="btn-chip text-down" disabled={busy} onClick={props.onDelete}>Delete</button>
      </div>
    </li>
  );
}
