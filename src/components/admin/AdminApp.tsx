"use client";

import { useCallback, useEffect, useState } from "react";
import type { Theme } from "@/lib/theme";
import type { BoardPayload } from "@/lib/types";
import { BrandLogo } from "../BrandLogo";
import { api, ApiError } from "./api";
import { LoginForm } from "./LoginForm";
import { RatesEditor } from "./RatesEditor";
import { RateForm } from "./RateForm";
import { SettingsForm } from "./SettingsForm";

type Tab = "rates" | "add" | "settings";

export function AdminApp() {
  const [board, setBoard] = useState<BoardPayload | null>(null);
  const [state, setState] = useState<"loading" | "login" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("rates");

  const load = useCallback(async () => {
    try {
      setBoard(await api<BoardPayload>("/api/admin/board"));
      setState("ready");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setState("login");
      else {
        setMessage(err instanceof Error ? err.message : "Could not load.");
        setState("error");
      }
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  /** Called by child forms after a save. A 401 means the session ended, so show the login again. */
  const onError = useCallback((err: unknown) => {
    if (err instanceof ApiError && err.status === 401) setState("login");
    setMessage(err instanceof Error ? err.message : "Something went wrong.");
  }, []);

  const flash = useCallback((text: string) => {
    setMessage(text);
    setTimeout(() => setMessage((m) => (m === text ? null : m)), 3000);
  }, []);

  async function logout() {
    await api("/api/admin/logout", { method: "POST" }).catch(() => {});
    setBoard(null);
    setState("login");
  }

  if (state === "loading") return <Shell><p className="p-6 text-fg-soft">Loading...</p></Shell>;
  if (state === "login") return <Shell><LoginForm onDone={() => { setMessage(null); void load(); }} /></Shell>;
  if (state === "error" || !board)
    return (
      <Shell>
        <div className="space-y-4 p-6">
          <p className="text-down">{message}</p>
          <button className="btn-primary" onClick={() => void load()}>Try again</button>
        </div>
      </Shell>
    );

  const categories = [...new Set([...board.settings.categoryOrder, ...board.rates.map((r) => r.category)])];

  return (
    <Shell
      right={
        <div className="flex items-center gap-2">
          <a href="/" target="_blank" className="btn-ghost">Screen</a>
          <button className="btn-ghost" onClick={() => void logout()}>Log out</button>
        </div>
      }
    >
      <nav className="sticky top-0 z-10 grid grid-cols-3 gap-1 border-b border-edge bg-surface p-2">
        {(
          [
            ["rates", "Rates"],
            ["add", "Add item"],
            ["settings", "Screen"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`min-h-12 rounded-xl text-base font-bold ${tab === id ? "bg-fg text-bg" : "text-fg hover:bg-surface-2"}`}
          >
            {label}
          </button>
        ))}
      </nav>

      {message && (
        <p role="status" className="mx-4 mt-4 rounded-xl bg-fg px-4 py-3 text-sm font-semibold text-bg">
          {message}
        </p>
      )}

      <div className="p-4">
        {tab === "rates" && (
          <RatesEditor board={board} onChanged={load} onError={onError} onSaved={flash} />
        )}
        {tab === "add" && (
          <RateForm
            categories={categories}
            onError={onError}
            onSaved={async () => {
              flash("Item added. It is on the screen now.");
              await load();
              setTab("rates");
            }}
          />
        )}
        {tab === "settings" && (
          <SettingsForm
            settings={board.settings}
            onError={onError}
            onSaved={async () => {
              flash("Screen settings saved.");
              await load();
            }}
          />
        )}
      </div>
    </Shell>
  );
}

const ADMIN_THEME_KEY = "vr-admin-theme";

/** The admin panel's own Day/Night choice, remembered on this phone. Defaults to the phone's setting. */
function useAdminTheme() {
  const [theme, setTheme] = useState<Theme>("day");
  useEffect(() => {
    const t = setTimeout(() => {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(ADMIN_THEME_KEY);
      } catch {
        /* storage blocked */
      }
      if (saved === "day" || saved === "night") setTheme(saved);
      else if (window.matchMedia("(prefers-color-scheme: dark)").matches) setTheme("night");
    }, 0);
    return () => clearTimeout(t);
  }, []);
  const toggle = () =>
    setTheme((cur) => {
      const next = cur === "day" ? "night" : "day";
      try {
        localStorage.setItem(ADMIN_THEME_KEY, next);
      } catch {
        /* storage blocked */
      }
      return next;
    });
  return { theme, toggle };
}

function Shell({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  const { theme, toggle } = useAdminTheme();
  return (
    <div data-theme={theme} className="min-h-dvh bg-bg text-fg">
      <header className="flex items-center justify-between gap-2 border-b border-edge bg-surface px-3 py-2">
        <div className="flex items-center gap-2">
          <BrandLogo height={44} priority />
          <span className="rounded-md bg-gold px-2 py-0.5 text-xs font-extrabold text-ink">ADMIN</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggle}
            className="btn-ghost"
            aria-label={theme === "day" ? "Switch to night theme" : "Switch to day theme"}
          >
            {theme === "day" ? "🌙 Night" : "☀️ Day"}
          </button>
          {right}
        </div>
      </header>
      <main className="mx-auto max-w-3xl">{children}</main>
    </div>
  );
}
