# 2026-10-20 — Done

- Created the project (Next.js 16, Tailwind 4, MongoDB driver, Pusher, zod).
- Decision: no own socket server / no Render. Vercel + Atlas M0 + Pusher Channels Sandbox (all free).
  Screens poll every 10 s without Pusher keys, every 60 s with Pusher as a backup.
- LCD board `/`: categories, big prices, ▲/▼ change badge, glow on change, clock, live status,
  moving message, auto-scroll, full-screen button, screen wake lock.
- Admin `/admin`: password login (signed cookie, Mongo login throttle), edit prices with −/+ and
  "Save all", add/edit/delete items, hide/show, in/out of stock, screen title/subtitle/message/category order.
- APIs: `/api/rates`, `/api/config`, `/api/health`, `/api/admin/*`. Price history saved per item.
- Fixed: a price-only save was wiping model/spec (zod defaults in the update schema). Test added.
- Checks: `tsc`, `eslint`, `next build` pass; 7 unit tests pass; API smoke test (wrong password 401,
  no login 401, other-site request 403, update + add work); board picked up changes in the browser.

## Later the same day — brand theme
- Real Volt On logo from voltonsolar.com (black text for Day, white for Night) on the board and admin.
- Day and Night themes from the shared Volt On palette (website + CRM): gold #f7b500, ink #0c1a2b/#07111f/#14263d,
  leaf #2da772, mist #f5f7f9/#e9eef3. All colours are semantic tokens in globals.css.
- Board theme: admin chooses Auto (Day 7 AM–6 PM) / Day / Night for all screens; each screen also has a
  Day / Night / Auto button (remembered on that TV), and `?theme=day|night` works in the URL.
- Admin panel has its own Day/Night button (remembered on the phone, defaults to the phone setting).
- Favicon + Apple icon: the logo's "O + bolt" mark on a navy tile (`src/app/icon.png`, `favicon.ico`, `apple-icon.png`).
- Checks: tsc, eslint, build pass; 9 unit tests pass; both themes checked in the browser.

## Notices + PWA
- Admin "📢 Notice" tab: message / picture / video (+ caption), quick messages, show for 1 min – 1 hour or
  until removed, "Remove notice now", live countdown. Screens show it full screen and close it on time.
- Uploads go straight from the phone to Cloudinary (signed, like the CRM), with a progress bar; or paste a link.
- PWA: manifest (opens /admin, shortcuts), icons, iPhone home-screen support, safe-area padding,
  service worker with offline page (never caches prices).
- Checked: notice API (bad link 400, no login 401, Cloudinary missing 503), text notice showed and closed
  by itself after 1 min, picture notice showed until removed, removal cleared screens. 13 unit tests pass.
- Not checked yet: a real video upload (needs Cloudinary keys) and installing on a real iPhone.
