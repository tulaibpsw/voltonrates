# Volt On Live Rates

A live solar price board for the office LCD screen.

- **`/`** — the screen. Open it on the TV browser and press **Full screen**.
- **`/admin`** — the owner logs in on a phone and changes prices. Every screen updates at once.

## How "live" works (and why there is no separate backend)

Vercel cannot keep WebSocket connections open, so we do not run our own socket server.
Instead, when the admin saves a price, the app sends a tiny "prices changed" message through
**Pusher Channels** (free Sandbox plan: 100 screens at once, 200,000 messages a day, no card).
Each screen then reloads the prices. If Pusher is not set up, screens refresh every 10 seconds.

Everything runs on free plans: Vercel Hobby + MongoDB Atlas M0 + Pusher Sandbox.

## Set up (one time)

1. **MongoDB Atlas** — create a free M0 cluster, a database user, and allow access from anywhere
   (`0.0.0.0/0`, needed for Vercel). Copy the connection string.
2. **Pusher** — sign up at pusher.com → Channels → create app (cluster `ap2` = Mumbai, closest to Pakistan).
   Copy `app_id`, `key`, `secret`, `cluster` from "App Keys".
3. **Vercel** — import this GitHub repo, then add the env vars from `.env.example` in
   Project → Settings → Environment Variables. Deploy.
4. Open `https://<your-app>.vercel.app/api/health` — it should say `"database":"ok"` and `"realtime":"pusher"`.
5. Open `/admin`, log in, add the products. Open `/` on the LCD.

## Run locally

```bash
npm install
cp .env.example .env.local   # then set MONGODB_URI=mongodb://127.0.0.1:27999, ADMIN_PASSWORD, SESSION_SECRET
npm run dev:db               # terminal 1: local test database with demo rates
npm run dev                  # terminal 2: http://localhost:3200
```

## Free-plan limits to know

- Vercel Hobby is meant for non-commercial use; for a business, Vercel Pro is the proper plan (phase 2 talk).
- Atlas M0 has no automatic backups.
- Pusher Sandbox: 100 screens connected at the same time — far more than one office needs.

## Notices

Admin → **📢 Notice**: send a message ("Everyone, please come to my office"), a picture, or a video.
It covers every screen full screen for 1 min … 1 hour, or until you press **Remove notice now**.
Pictures/videos upload to Cloudinary (add the `CLOUDINARY_*` keys — the same free account as the CRM),
or you can paste an `https://` link.

## Install on iPhone

Open `https://<your-app>.vercel.app/admin` in **Safari** → Share button → **Add to Home Screen**.
It opens full screen like an app with the Volt On icon. (On Android Chrome: menu → Install app.)
