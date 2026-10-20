<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Volt On Live Rates — project rules

A live price board for the Volt On Solar office LCD. The owner (admin) changes prices on `/admin`
from a phone; every screen showing `/` updates within a second.

## Stack and hosting (free tiers only, no monthly billing)
- Next.js 16 App Router + Tailwind 4, deployed on **Vercel Hobby**.
- **MongoDB Atlas M0** via the official `mongodb` driver (`src/lib/db.ts`, one cached client).
- **Pusher Channels Sandbox** for instant push (`src/lib/realtime.ts`). No WebSocket server of our own:
  Vercel functions cannot hold sockets open. Without Pusher keys the board auto-refreshes every 10 s;
  with Pusher it still checks every 60 s as a backup.
- Do not add a separate backend (Render etc.), long-running servers, in-memory state or local-disk storage.

## How it fits together
- `GET /api/rates` (public) → board JSON with a `version` number.
- Admin routes under `/api/admin/*` check the signed `vr_admin` cookie and the request origin
  (`guardAdmin` in `src/lib/http.ts`). Every change bumps the version and calls `broadcastChange()`.
- Screens (`src/components/useLiveBoard.ts`) get the Pusher signal and re-fetch `/api/rates`.
  We send only `{ version }` over Pusher, never the whole board (10 KB message limit).
- Price history is kept in `rate_history`; `previousPrice` drives the ▲/▼ badge.
- Cache Components is on: pages are static shells, all data loads in client components from route handlers.
  Never read `Date.now()` / `new Date()` during render of a prerendered component.

## Auth
- Single owner login: `ADMIN_PASSWORD` + `SESSION_SECRET` env vars (HMAC-signed cookie, 30 days).
  Changing the password logs every device out. Failed logins are throttled in Mongo (8 per 15 min per IP).
- Secrets live only in `.env.local` and Vercel env settings. Never commit them, never print them.

## UI rules
- Board (`/`): made for a 1080p TV, dark Volt On brand (gold `#f7b500`, ink `#0c1a2b`, leaf `#2da772`,
  fonts Sora + Manrope). Text sizes use `clamp(..vw..)`. Auto-scrolls when the list is taller than the screen.
- Admin (`/admin`): mobile-first. Main buttons 56 px, nothing under 44 px. Simple English labels.

## Working on it
- `npm run dev:db` starts a local in-memory MongoDB (port 27999) with demo rates.
  Point `.env.local` `MONGODB_URI` at `mongodb://127.0.0.1:27999` for local work. Never seed the live DB.
- `npm run dev` (port 3200), `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.
- Record each working day in `progress/YYYY-MM-DD/` (`done.md`, `next.md`, `remaining.md`).

## Notices (full-screen alert on every screen)
- One notice at a time, stored on the `meta` "board" doc (`setNotice` / `clearNotice` in `src/lib/rates.ts`).
  Kinds: `text`, `image`, `video` (+ optional caption). Ends at `showUntil` or when the admin removes it.
- `/api/rates` only sends a notice that has not expired. Screens close it on time by themselves using the
  server clock offset (`clockOffsetMs` from `useLiveBoard`), so no push is needed at expiry.
- Media: Cloudinary, same as the CRM — the browser uploads straight to Cloudinary with a signature from
  `POST /api/admin/uploads/sign` (never through Vercel: 4.5 MB body limit). Public files in `volton/rates-notices`.
  Pasted links must be `https://`.

## PWA
- `src/app/manifest.ts` (opens `/admin`), icons in `public/icons/`, `src/app/apple-icon.png`, `appleWebApp` in the layout.
- `public/sw.js` is network-first and never caches `/api/*` (prices must stay live). Bump `CACHE` when changing it.
- Registered only in production (`RegisterServiceWorker`). Admin UI pads for the iPhone notch with `env(safe-area-inset-*)`.
