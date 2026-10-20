"use client";

import { useEffect, useRef } from "react";
import type { Notice } from "@/lib/types";
import { BrandLogo } from "./BrandLogo";

/** Full-screen notice on the TV. Hidden by the board once `showUntil` passes or the admin removes it. */
export function NoticeOverlay({ notice, remainingMs }: { notice: Notice; remainingMs: number | null }) {
  return (
    <div role="alert" aria-live="assertive" className="notice-in fixed inset-0 z-50 flex flex-col bg-bg text-fg">
      {notice.kind === "text" ? <TextNotice notice={notice} /> : <MediaNotice notice={notice} />}
      {remainingMs !== null && (
        <p className="absolute right-[2vw] bottom-[2vh] rounded-full bg-surface-2/90 px-4 py-2 text-[clamp(0.8rem,1vw,1.4rem)] font-bold text-fg-soft tabular-nums">
          Back to rates in {formatLeft(remainingMs)}
        </p>
      )}
    </div>
  );
}

function TextNotice({ notice }: { notice: Notice }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-[4vh] px-[6vw] text-center">
      <BrandLogo height="clamp(4rem, 9vw, 12rem)" priority />
      <div className="notice-pulse inline-flex items-center gap-3 rounded-full bg-gold px-[2.4vw] py-[1vh] font-display text-[clamp(1.2rem,2.2vw,3.2rem)] font-extrabold tracking-widest text-ink uppercase">
        📢 Notice
      </div>
      <p className="max-w-[85vw] font-display text-[clamp(2.4rem,6.5vw,10rem)] leading-[1.1] font-extrabold tracking-tight break-words whitespace-pre-line">
        {notice.message}
      </p>
    </div>
  );
}

function MediaNotice({ notice }: { notice: Notice }) {
  return (
    <div className="relative flex flex-1 flex-col bg-black">
      <div className="relative min-h-0 flex-1">
        {notice.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote admin upload, shown as-is on the TV
          <img src={notice.mediaUrl} alt={notice.message || "Notice"} className="absolute inset-0 size-full object-contain" />
        ) : (
          <NoticeVideo key={notice.id} src={notice.mediaUrl} sound={notice.sound} />
        )}
      </div>
      {notice.message && (
        <p className="border-t-4 border-gold bg-ink px-[3vw] py-[2vh] text-center font-display text-[clamp(1.4rem,3vw,4.4rem)] font-extrabold text-white">
          {notice.message}
        </p>
      )}
    </div>
  );
}

/** Autoplays and loops. With sound if asked; browsers often block that, so we fall back to muted. */
function NoticeVideo({ src, sound }: { src: string; sound: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = !sound;
    v.play().catch(() => {
      v.muted = true;
      void v.play().catch(() => {});
    });
  }, [sound]);
  return <video ref={ref} src={src} autoPlay muted loop playsInline className="absolute inset-0 size-full object-contain" />;
}

function formatLeft(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}
