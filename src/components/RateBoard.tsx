"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatPrice, groupByCategory, priceChange, timeAgo } from "@/lib/format";
import { parseThemeMode, resolveTheme } from "@/lib/theme";
import { UNIT_LABEL, type Rate, type ThemeMode } from "@/lib/types";
import { BrandLogo } from "./BrandLogo";
import { NoticeOverlay } from "./NoticeOverlay";
import { useLiveBoard, type LiveStatus } from "./useLiveBoard";

const FLASH_MS = 8000;

export function RateBoard() {
  const { board, status, error, clockOffsetMs } = useLiveBoard();
  const now = useNow(1000);
  const flashing = useChangedIds(board?.rates);
  const scrollRef = useAutoScroll();
  const controlsVisible = useIdleControls();
  useWakeLock();
  const screenTheme = useScreenTheme();
  const theme = resolveTheme(screenTheme.mode ?? board?.settings.theme ?? "auto", now);

  // The notice closes itself on time, using the server's clock (the TV clock may be wrong).
  const notice = board?.notice ?? null;
  const serverNow = now ? now.getTime() + clockOffsetMs : null;
  const noticeLeftMs = notice?.showUntil && serverNow !== null ? Date.parse(notice.showUntil) - serverNow : null;
  const showNotice = notice !== null && (noticeLeftMs === null || noticeLeftMs > 0);

  const groups = useMemo(
    () => (board ? groupByCategory(board.rates, board.settings.categoryOrder) : []),
    [board],
  );
  const lastChange = useMemo(() => {
    const times = (board?.rates ?? []).map((r) => r.priceChangedAt ?? r.updatedAt).sort();
    return times.at(-1) ?? null;
  }, [board]);

  return (
    <div
      data-theme={theme}
      className={`flex h-dvh flex-col overflow-hidden bg-bg text-fg ${controlsVisible ? "" : "cursor-none"}`}
    >
      <header className="flex items-center justify-between gap-6 border-b border-edge bg-surface px-[3vw] shadow-brand py-[1.6vh]">
        <div className="flex items-center gap-[1.6vw]">
          <BrandLogo height="clamp(3.2rem, 6.5vw, 9rem)" priority />
          <div className="border-l-4 border-gold pl-[1.4vw]">
            <h1 className="font-display text-[clamp(1.5rem,2.6vw,3.6rem)] leading-tight font-extrabold tracking-tight">
              {board?.settings.title ?? "Volt On Solar"}
            </h1>
            <p className="text-[clamp(0.9rem,1.25vw,1.8rem)] font-semibold text-accent-text">
              {board?.settings.subtitle ?? "Today's Market Rates"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-[2vw]">
        <ThemeSwitch mode={screenTheme.mode} onChoose={screenTheme.choose} />
        <div className="text-right">
          <p className="font-display text-[clamp(1.4rem,2.4vw,3.4rem)] leading-none font-bold tabular-nums">
            {now ? now.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--:--"}
          </p>
          <p className="mt-1 text-[clamp(0.8rem,1vw,1.4rem)] text-fg-soft">
            {now?.toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          <StatusPill status={status} hasError={Boolean(error)} />
        </div>
        </div>
      </header>

      <main ref={scrollRef} className="flex-1 overflow-hidden px-[3vw] py-[2vh]">
        {!board && !error && <CenterNote text="Loading rates..." />}
        {!board && error && <CenterNote text={error} />}
        {board && groups.length === 0 && <CenterNote text="No rates yet. The admin can add them from /admin." />}
        <div className="grid gap-[2vh] lg:grid-cols-2 lg:gap-x-[2vw]">
          {groups.map((g) => (
            <section key={g.category} className="overflow-hidden rounded-2xl border border-edge bg-surface shadow-brand">
              <h2 className="flex items-center justify-between bg-gold px-[1.4vw] py-[0.9vh] font-display text-[clamp(1.05rem,1.5vw,2.2rem)] font-extrabold text-ink uppercase">
                <span>{g.category}</span>
                <span className="text-[0.65em] font-bold opacity-70">Rs</span>
              </h2>
              <ul className="divide-y divide-edge">
                {g.rates.map((r) => (
                  <RateRow key={r.id} rate={r} flash={flashing.has(r.id)} now={now?.getTime()} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>

      <footer className="flex items-center gap-4 border-t border-edge bg-surface text-[clamp(0.85rem,1.1vw,1.6rem)]">
        <div className="shrink-0 bg-leaf px-[1.4vw] py-[1vh] font-bold whitespace-nowrap text-ink">
          Updated {timeAgo(lastChange, now?.getTime())}
        </div>
        <Ticker text={board?.settings.ticker ?? ""} />
      </footer>

      {showNotice && notice && <NoticeOverlay key={notice.id} notice={notice} remainingMs={noticeLeftMs} />}

      <button
        type="button"
        onClick={toggleFullscreen}
        className={`fixed right-4 bottom-20 z-[60] rounded-xl bg-gold px-5 py-3 font-bold text-ink shadow-lg transition-opacity ${controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        Full screen
      </button>
    </div>
  );
}

function RateRow({ rate, flash, now }: { rate: Rate; flash: boolean; now?: number }) {
  const change = priceChange(rate);
  return (
    <li
      className={`flex items-center justify-between gap-4 px-[1.4vw] py-[1.1vh] ${flash ? "flash" : ""} ${rate.inStock ? "" : "opacity-50"}`}
    >
      <div className="min-w-0">
        <p className="truncate font-display text-[clamp(1rem,1.45vw,2.1rem)] font-bold">
          {rate.brand} <span className="font-semibold text-fg-soft">{rate.model}</span>
        </p>
        <p className="truncate text-[clamp(0.75rem,0.95vw,1.35rem)] text-fg-soft">
          {[rate.spec, rate.inStock ? null : "Out of stock", flash ? "Just updated" : null]
            .filter(Boolean)
            .join("  •  ") || " "}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-[1vw]">
        {change !== 0 && <ChangeBadge change={change} title={timeAgo(rate.priceChangedAt, now)} />}
        <p className="text-right font-display leading-none tabular-nums">
          <span className="text-[clamp(1.4rem,2.3vw,3.4rem)] font-extrabold text-price">{formatPrice(rate.price)}</span>
          <span className="ml-1 text-[clamp(0.7rem,0.9vw,1.3rem)] font-semibold text-fg-soft">
            {UNIT_LABEL[rate.unit]}
          </span>
        </p>
      </div>
    </li>
  );
}

function ChangeBadge({ change, title }: { change: number; title: string }) {
  const up = change > 0;
  return (
    <span
      title={title}
      className={`rounded-lg px-[0.6vw] py-[0.3vh] text-[clamp(0.8rem,1.05vw,1.5rem)] font-bold tabular-nums ${up ? "bg-up-soft text-up" : "bg-down-soft text-down"}`}
    >
      {up ? "▲" : "▼"} {formatPrice(Math.abs(change))}
    </span>
  );
}

function StatusPill({ status, hasError }: { status: LiveStatus; hasError: boolean }) {
  const label = hasError ? "Reconnecting" : { connecting: "Connecting", live: "Live", polling: "Auto refresh", offline: "Offline" }[status];
  const color = hasError || status === "offline" ? "bg-down" : status === "live" ? "bg-leaf" : "bg-gold";
  return (
    <p className="mt-1 inline-flex items-center gap-2 text-[clamp(0.75rem,0.9vw,1.25rem)] font-semibold text-fg-soft">
      <span className={`live-dot inline-block size-[0.8em] rounded-full ${color}`} />
      {label}
    </p>
  );
}

function Ticker({ text }: { text: string }) {
  if (!text) return <div className="flex-1" />;
  const duration = Math.max(20, text.length * 0.35);
  return (
    <div className="relative flex-1 overflow-hidden py-[1vh]">
      <div className="ticker-track flex w-max gap-24 whitespace-nowrap" style={{ ["--ticker-duration" as string]: `${duration}s` }}>
        <span>{text}</span>
        <span aria-hidden>{text}</span>
      </div>
    </div>
  );
}

function CenterNote({ text }: { text: string }) {
  return <p className="py-[20vh] text-center text-[clamp(1.2rem,2vw,2.6rem)] text-fg-soft">{text}</p>;
}

const SCREEN_THEME_KEY = "vr-screen-theme";

/**
 * This screen's own theme choice: from ?theme=day|night in the URL, or the Day/Night button
 * (remembered on this TV). Null = follow the admin's setting.
 */
function useScreenTheme() {
  const [mode, setMode] = useState<ThemeMode | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(SCREEN_THEME_KEY);
      } catch {
        /* storage blocked */
      }
      const fromUrl = parseThemeMode(new URLSearchParams(window.location.search).get("theme"));
      const chosen = fromUrl ?? parseThemeMode(saved);
      setMode(chosen === "auto" ? null : chosen);
    }, 0);
    return () => clearTimeout(t);
  }, []);
  const choose = (next: ThemeMode) => {
    setMode(next === "auto" ? null : next);
    try {
      if (next === "auto") localStorage.removeItem(SCREEN_THEME_KEY);
      else localStorage.setItem(SCREEN_THEME_KEY, next);
    } catch {
      /* storage blocked: the choice lasts until the page reloads */
    }
  };
  return { mode, choose };
}

function ThemeSwitch({ mode, onChoose }: { mode: ThemeMode | null; onChoose: (m: ThemeMode) => void }) {
  const options: { id: ThemeMode; label: string; title: string }[] = [
    { id: "day", label: "☀️ Day", title: "Light theme on this screen" },
    { id: "night", label: "🌙 Night", title: "Dark theme on this screen" },
    { id: "auto", label: "Auto", title: "Follow the admin setting" },
  ];
  const current = mode ?? "auto";
  return (
    <div role="group" aria-label="Screen theme" className="inline-flex rounded-full border border-edge bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          title={o.title}
          aria-pressed={current === o.id}
          onClick={() => onChoose(o.id)}
          className={`min-h-11 rounded-full px-3 text-[clamp(0.8rem,0.9vw,1.2rem)] font-bold whitespace-nowrap transition-colors ${current === o.id ? "bg-gold text-ink" : "text-fg-soft hover:text-fg"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen?.().catch(() => {});
}

/** Current time, updated every `ms`. Null on the first render to avoid a server/client mismatch. */
function useNow(ms: number) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const t = setInterval(tick, ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/** Ids whose price changed since the last refresh. They flash for a few seconds. */
function useChangedIds(rates: Rate[] | undefined) {
  const prev = useRef<Map<string, number> | null>(null);
  const [flashing, setFlashing] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!rates) return;
    const next = new Map(rates.map((r) => [r.id, r.price]));
    const before = prev.current;
    prev.current = next;
    if (!before) return; // first load: nothing to highlight
    const changed = rates.filter((r) => before.has(r.id) ? before.get(r.id) !== r.price : true).map((r) => r.id);
    if (changed.length === 0) return;
    setFlashing((s) => new Set([...s, ...changed]));
    const t = setTimeout(() => {
      setFlashing((s) => {
        const copy = new Set(s);
        changed.forEach((id) => copy.delete(id));
        return copy;
      });
    }, FLASH_MS);
    return () => clearTimeout(t);
  }, [rates]);
  return flashing;
}

/** When the list is taller than the screen, scroll slowly down, pause, and jump back to the top. */
function useAutoScroll() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let pauseUntil = performance.now() + 5000;
    let last = performance.now();
    let pos = 0;
    const SPEED = 35; // px per second
    const step = (t: number) => {
      const dt = (t - last) / 1000;
      last = t;
      const max = el.scrollHeight - el.clientHeight;
      if (max > 4 && t > pauseUntil) {
        pos += SPEED * dt;
        if (pos >= max) {
          pos = max;
          el.scrollTop = pos;
          pauseUntil = t + 5000;
          setTimeout(() => {
            pos = 0;
            el.scrollTo({ top: 0, behavior: "smooth" });
          }, 4500);
        } else {
          el.scrollTop = pos;
        }
      } else if (max <= 4) {
        pos = 0;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);
  return ref;
}

/** Show the full-screen button and cursor only after the mouse moves; hide after 3 s. */
function useIdleControls() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    let t = setTimeout(() => setVisible(false), 4000);
    const wake = () => {
      setVisible(true);
      clearTimeout(t);
      t = setTimeout(() => setVisible(false), 3000);
    };
    window.addEventListener("mousemove", wake);
    window.addEventListener("touchstart", wake);
    window.addEventListener("keydown", wake);
    return () => {
      clearTimeout(t);
      window.removeEventListener("mousemove", wake);
      window.removeEventListener("touchstart", wake);
      window.removeEventListener("keydown", wake);
    };
  }, []);
  return visible;
}

/** Ask the browser not to dim or sleep the TV while the board is open. */
function useWakeLock() {
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const request = async () => {
      try {
        const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
        if (nav.wakeLock && document.visibilityState === "visible") lock = await nav.wakeLock.request("screen");
      } catch {
        /* not supported or not allowed; the TV's own settings apply */
      }
    };
    void request();
    const onVisible = () => void request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => {});
    };
  }, []);
}
