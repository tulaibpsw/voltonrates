import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { realtimeEnabled } from "@/lib/realtime";
import { json } from "@/lib/http";

export async function GET(req: NextRequest) {
  void req.nextUrl.searchParams;
  let database = "ok";
  try {
    await (await getDb()).command({ ping: 1 });
  } catch (err) {
    database = err instanceof Error ? err.message : "error";
  }
  return json(
    {
      database,
      realtime: realtimeEnabled() ? "pusher" : "polling-only",
      adminConfigured: Boolean(process.env.ADMIN_PASSWORD && process.env.SESSION_SECRET),
    },
    database === "ok" ? 200 : 503,
  );
}
