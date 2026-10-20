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
