import type { NextRequest } from "next/server";
import { sameOrigin, SESSION_COOKIE } from "@/lib/auth";
import { error, json } from "@/lib/http";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return error("Bad origin", 403);
  const res = json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
