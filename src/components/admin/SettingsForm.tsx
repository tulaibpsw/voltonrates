"use client";

import { useState } from "react";
import type { BoardSettings, ThemeMode } from "@/lib/types";

const THEMES: { id: ThemeMode; label: string; hint: string }[] = [
  { id: "auto", label: "Auto", hint: "Day 7 AM – 6 PM, Night after" },
  { id: "day", label: "☀️ Day", hint: "Light, always" },
  { id: "night", label: "🌙 Night", hint: "Dark, always" },
];
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
  const [theme, setTheme] = useState<ThemeMode>(settings.theme ?? "auto");
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
          theme,
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
    <form onSubmit={submit} className="space-y-4 rounded-2xl bg-surface p-5 shadow-sm">
      <h2 className="font-display text-xl font-extrabold">What the screen shows</h2>
      <fieldset>
        <legend className="label">Screen theme</legend>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              aria-pressed={theme === t.id}
              className={`min-h-14 rounded-xl border-2 px-2 py-2 text-left ${theme === t.id ? "border-gold bg-gold/15" : "border-edge"}`}
            >
              <span className="block font-display font-extrabold">{t.label}</span>
              <span className="block text-xs text-fg-soft">{t.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>
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
