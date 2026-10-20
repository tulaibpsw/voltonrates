"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BoardPayload } from "@/lib/types";

export type LiveStatus = "connecting" | "live" | "polling" | "offline";

const POLL_WITH_PUSHER_MS = 60_000; // backup check, in case a push message is missed
const POLL_WITHOUT_PUSHER_MS = 10_000; // when Pusher keys are not set yet

/**
 * Keeps the board fresh: loads /api/rates, listens on Pusher for "prices changed",
 * and polls as a safety net. Re-fetches when the tab becomes visible or the network returns.
 */
export function useLiveBoard() {
  const [board, setBoard] = useState<BoardPayload | null>(null);
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const versionRef = useRef(-1);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch("/api/rates", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not load rates");
      versionRef.current = data.version;
      setBoard(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load rates");
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    let disconnect: (() => void) | undefined;

    const startPolling = (ms: number) => {
      if (timer) clearInterval(timer);
      timer = setInterval(refresh, ms);
    };

    const first = setTimeout(refresh, 0);
    startPolling(POLL_WITHOUT_PUSHER_MS);

    (async () => {
      try {
        const cfg = await fetch("/api/config", { cache: "no-store" }).then((r) => r.json());
        if (cancelled) return;
        if (!cfg?.pusher) {
          setStatus("polling");
          return;
        }
        const { default: Pusher } = await import("pusher-js");
        if (cancelled) return;
        const client = new Pusher(cfg.pusher.key, { cluster: cfg.pusher.cluster });
        const channel = client.subscribe("rates");
        channel.bind("changed", (msg: { version?: number }) => {
          if (msg?.version !== versionRef.current) void refresh();
        });
        client.connection.bind("state_change", ({ current }: { current: string }) => {
          if (current === "connected") {
            setStatus("live");
            startPolling(POLL_WITH_PUSHER_MS);
            void refresh(); // catch anything we missed while disconnected
          } else if (current === "unavailable" || current === "failed" || current === "disconnected") {
            setStatus("polling");
            startPolling(POLL_WITHOUT_PUSHER_MS);
          }
        });
        disconnect = () => client.disconnect();
      } catch {
        setStatus("polling");
      }
    })();

    const onVisible = () => document.visibilityState === "visible" && void refresh();
    const onOnline = () => void refresh();
    const onOffline = () => setStatus("offline");
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      cancelled = true;
      clearTimeout(first);
      if (timer) clearInterval(timer);
      disconnect?.();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [refresh]);

  return { board, status, error, refresh };
}
