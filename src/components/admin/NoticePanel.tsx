"use client";

import { useEffect, useState } from "react";
import type { Notice, NoticeKind } from "@/lib/types";
import { api } from "./api";

interface Props {
  notice: Notice | null;
  onChanged: () => Promise<void>;
  onError: (err: unknown) => void;
  onSaved: (msg: string) => void;
}

const QUICK_MESSAGES = ["Everyone, please come to my office", "Team meeting in 5 minutes", "Customer arriving — please be ready"];

const DURATIONS: { label: string; minutes: number | null }[] = [
  { label: "1 min", minutes: 1 },
  { label: "5 min", minutes: 5 },
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "Until I remove it", minutes: null },
];

const MAX_IMAGE_MB = 10; // Cloudinary free plan limits
const MAX_VIDEO_MB = 100;

/** Push a full-screen notice (message, picture or video) to every screen, for a set time or until removed. */
export function NoticePanel({ notice, onChanged, onError, onSaved }: Props) {
  const [kind, setKind] = useState<NoticeKind>("text");
  const [message, setMessage] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [sound, setSound] = useState(false);
  const [minutes, setMinutes] = useState<number | null>(5);
  const [busy, setBusy] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);

  async function upload(file: File) {
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) return onError(new Error("Choose a picture or a video file."));
    const limit = isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB;
    if (file.size > limit * 1024 * 1024) return onError(new Error(`File is too big. Max ${limit} MB for a ${isVideo ? "video" : "picture"}.`));
    try {
      const sig = await api<{ uploadUrl: string; fields: Record<string, string | number> }>("/api/admin/uploads/sign", { method: "POST" });
      const form = new FormData();
      Object.entries(sig.fields).forEach(([k, v]) => form.append(k, String(v)));
      form.append("file", file);
      setUploadPct(0);
      const url = await xhrUpload(sig.uploadUrl, form, setUploadPct);
      setMediaUrl(url);
      setKind(isVideo ? "video" : "image");
    } catch (err) {
      onError(err);
    } finally {
      setUploadPct(null);
    }
  }

  async function show() {
    setBusy(true);
    try {
      await api("/api/admin/notice", {
        method: "PUT",
        body: { kind, message, mediaUrl: kind === "text" ? "" : mediaUrl, sound, durationMinutes: minutes },
      });
      onSaved("Notice is on the screen now.");
      await onChanged();
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api("/api/admin/notice", { method: "DELETE" });
      onSaved("Notice removed. Screens show the rates again.");
      await onChanged();
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  }

  const canShow = kind === "text" ? message.trim().length > 0 : mediaUrl.length > 0;

  return (
    <div className="space-y-4">
      {notice && <ActiveNotice notice={notice} busy={busy} onRemove={() => void remove()} />}

      <div className="space-y-4 rounded-2xl bg-surface p-5 shadow-sm">
        <h2 className="font-display text-xl font-extrabold">{notice ? "Show a different notice" : "Show a notice on the screen"}</h2>

        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Notice type">
          {(
            [
              ["text", "💬 Message"],
              ["image", "🖼️ Picture"],
              ["video", "🎬 Video"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={kind === id}
              onClick={() => setKind(id)}
              className={`min-h-14 rounded-xl border-2 font-bold ${kind === id ? "border-gold bg-gold/15" : "border-edge"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {kind !== "text" && (
          <div className="space-y-3">
            <label className="btn-primary min-h-14 w-full cursor-pointer">
              {uploadPct !== null ? `Uploading... ${uploadPct}%` : kind === "video" ? "Choose video from phone" : "Choose picture from phone"}
              <input
                type="file"
                accept={kind === "video" ? "video/mp4,video/webm,video/quicktime" : "image/jpeg,image/png,image/webp,image/gif"}
                className="sr-only"
                disabled={uploadPct !== null}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void upload(f);
                }}
              />
            </label>
            <label className="block">
              <span className="label">…or paste a link (https://)</span>
              <input className="input" inputMode="url" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value.trim())} placeholder="https://..." />
            </label>
            {mediaUrl && (
              <div className="overflow-hidden rounded-xl bg-black">
                {kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element -- preview of a remote upload
                  <img src={mediaUrl} alt="Preview" className="max-h-60 w-full object-contain" />
                ) : (
                  <video src={mediaUrl} controls muted playsInline className="max-h-60 w-full" />
                )}
              </div>
            )}
            {kind === "video" && (
              <label className="flex min-h-12 items-center gap-3">
                <input type="checkbox" className="size-6 accent-[var(--gold)]" checked={sound} onChange={(e) => setSound(e.target.checked)} />
                <span className="font-semibold">Try to play with sound (some TVs only allow muted)</span>
              </label>
            )}
          </div>
        )}

        <label className="block">
          <span className="label">{kind === "text" ? "Message" : "Caption (optional)"}</span>
          <textarea
            className="input min-h-24 py-3 text-lg"
            value={message}
            maxLength={300}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={kind === "text" ? "e.g. Everyone, please come to my office" : "Shown under the picture/video"}
          />
        </label>
        {kind === "text" && (
          <div className="flex flex-wrap gap-2">
            {QUICK_MESSAGES.map((m) => (
              <button key={m} type="button" className="btn-chip text-sm" onClick={() => setMessage(m)}>
                {m}
              </button>
            ))}
          </div>
        )}

        <fieldset>
          <legend className="label">Show for</legend>
          <div className="grid grid-cols-3 gap-2">
            {DURATIONS.map((d) => (
              <button
                key={d.label}
                type="button"
                aria-pressed={minutes === d.minutes}
                onClick={() => setMinutes(d.minutes)}
                className={`min-h-12 rounded-xl border-2 px-2 text-sm font-bold ${minutes === d.minutes ? "border-gold bg-gold/15" : "border-edge"} ${d.minutes === null ? "col-span-3" : ""}`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </fieldset>

        <button className="btn-primary min-h-14 w-full text-lg" disabled={!canShow || busy || uploadPct !== null} onClick={() => void show()}>
          {busy ? "Sending..." : "📢 Show on screen now"}
        </button>
      </div>
    </div>
  );
}

function ActiveNotice({ notice, busy, onRemove }: { notice: Notice; busy: boolean; onRemove: () => void }) {
  const left = useCountdown(notice.showUntil);
  return (
    <div className="space-y-3 rounded-2xl border-2 border-gold bg-surface p-5 shadow-sm">
      <p className="inline-flex items-center gap-2 rounded-full bg-gold px-3 py-1 text-xs font-extrabold text-ink">
        <span className="live-dot inline-block size-2 rounded-full bg-ink" /> SHOWING NOW
      </p>
      <p className="font-display text-lg font-extrabold">
        {notice.kind === "text" ? notice.message : `${notice.kind === "image" ? "Picture" : "Video"}${notice.message ? ` — ${notice.message}` : ""}`}
      </p>
      <p className="text-sm text-fg-soft">{notice.showUntil ? (left ? `Goes back to rates in ${left}` : "Ending...") : "Stays until you remove it"}</p>
      <button className="min-h-14 w-full rounded-xl bg-down font-display text-lg font-extrabold text-white disabled:opacity-40" disabled={busy} onClick={onRemove}>
        Remove notice now
      </button>
    </div>
  );
}

function useCountdown(until: string | null): string | null {
  const [left, setLeft] = useState<string | null>(null);
  useEffect(() => {
    if (!until) return;
    const tick = () => {
      const ms = Date.parse(until) - Date.now();
      if (ms <= 0) return setLeft(null);
      const s = Math.ceil(ms / 1000);
      setLeft(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);
    };
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [until]);
  return left;
}

/** XHR (not fetch) so we can show upload progress for big videos. Resolves to the Cloudinary https URL. */
function xhrUpload(url: string, form: FormData, onPct: (p: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => e.lengthComputable && onPct(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && body.secure_url) resolve(body.secure_url);
        else reject(new Error(body?.error?.message ? `Upload failed: ${body.error.message}` : "Upload failed."));
      } catch {
        reject(new Error("Upload failed."));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed. Check the internet and try again."));
    xhr.send(form);
  });
}
