"use client";

import { useState } from "react";
import { api } from "./api";

export function LoginForm({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/admin/login", { method: "POST", body: { password } });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not log in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-4 mt-10 max-w-sm space-y-4 sm:mx-auto rounded-2xl bg-white p-6 shadow-sm">
      <h1 className="font-display text-2xl font-extrabold">Admin login</h1>
      <p className="text-sm text-muted">Only the owner can change rates.</p>
      <label className="block">
        <span className="label">Password</span>
        <input
          type="password"
          autoComplete="current-password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          required
        />
      </label>
      {error && <p className="text-sm font-semibold text-danger">{error}</p>}
      <button className="btn-primary w-full" disabled={busy}>{busy ? "Checking..." : "Log in"}</button>
    </form>
  );
}
