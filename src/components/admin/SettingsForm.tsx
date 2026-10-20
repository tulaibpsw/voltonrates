"use client";

import { useState } from "react";
import type { BoardSettings } from "@/lib/types";
import { api } from "./api";

interface Props {
  settings: BoardSettings;
  onSaved: () => void | Promise<void>;
  onError: (err: unknown) => void;
}

export function SettingsForm({ settings, onSaved, onError }: Props) {
  const [title, setTitle] = useState(settings.title);
  const [subtitle, setSubtitle] = useState(settings.subtitle);
  const [ticker, setTicker] = useState(settings.ticker);
  const [order, setOrder] = useState(settings.categoryOrder.join("\n"));
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/admin/settings", {
        method: "PUT",
        body: {
          title,
          subtitle,
          ticker,
          categoryOrder: order.split("\n").map((s) => s.trim()).filter(Boolean),
        },
      });
      await onSaved();
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="font-display text-xl font-extrabold">What the screen shows</h2>
      <label className="block">
        <span className="label">Title</span>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <label className="block">
        <span className="label">Subtitle</span>
        <input className="input" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
      </label>
      <label className="block">
        <span className="label">Moving message at the bottom</span>
        <textarea className="input min-h-24 py-3" value={ticker} onChange={(e) => setTicker(e.target.value)} />
      </label>
      <label className="block">
        <span className="label">Category order (one per line)</span>
        <textarea className="input min-h-32 py-3" value={order} onChange={(e) => setOrder(e.target.value)} />
      </label>
      <button className="btn-primary min-h-14 w-full" disabled={busy}>{busy ? "Saving..." : "Save"}</button>
    </form>
  );
}
