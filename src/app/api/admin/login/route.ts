import type { NextRequest } from "next/server";
import {
  checkPassword,
  clientIp,
  createSessionToken,
  loginBlocked,
  recordFailedLogin,
  sameOrigin,
  SESSION_COOKIE,
} from "@/lib/auth";
import { dbErrorResponse, error, json, readJson } from "@/lib/http";
import { loginSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return error("Bad origin", 403);
  const parsed = loginSchema.safeParse(await readJson(req));
  if (!parsed.success) return error("Enter the password.", 400);

  const ip = clientIp(req);
  try {
    if (await loginBlocked(ip)) return error("Too many wrong tries. Wait 15 minutes and try again.", 429);
    if (!checkPassword(parsed.data.password)) {
      await recordFailedLogin(ip);
      return error("Wrong password.", 401);
    }
  } catch (err) {
    return dbErrorResponse(err);
  }

  const { token, maxAge } = createSessionToken();
  const res = json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  return res;
}
