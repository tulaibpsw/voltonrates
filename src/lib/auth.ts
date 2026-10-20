import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { getDb } from "./db";

export const SESSION_COOKIE = "vr_admin";
const SESSION_DAYS = 30;
const MAX_FAILED_LOGINS = 8;
const FAILED_WINDOW_MS = 15 * 60 * 1000;

function secrets() {
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  if (!password || !secret || secret.length < 32) {
    throw new Error("ADMIN_PASSWORD and SESSION_SECRET (32+ chars) must be set.");
  }
  return { password, secret };
}

function sign(value: string): string {
  const { password, secret } = secrets();
  // The password is part of the key, so changing ADMIN_PASSWORD logs every device out.
  return createHmac("sha256", `${secret}:${password}`).update(value).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function checkPassword(input: string): boolean {
  const { password } = secrets();
  // Compare HMACs so the check takes the same time whatever the input length.
  return safeEqual(sign(`pw:${input}`), sign(`pw:${password}`));
}

export function createSessionToken(): { token: string; maxAge: number } {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  const exp = String(Date.now() + maxAge * 1000);
  return { token: `${exp}.${sign(exp)}`, maxAge };
}

export function isValidSession(token: string | undefined): boolean {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  return safeEqual(sig, sign(exp));
}

export function isAdmin(req: NextRequest): boolean {
  return isValidSession(req.cookies.get(SESSION_COOKIE)?.value);
}

/** Reject state-changing requests sent from another website. */
export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // the SameSite=Lax cookie still blocks cross-site posts
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

export function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

/** Login throttle stored in Mongo, because serverless functions share no memory. */
export async function loginBlocked(ip: string): Promise<boolean> {
  const db = await getDb();
  const col = db.collection<{ ip: string; at: Date }>("login_failures");
  await col.createIndex({ at: 1 }, { expireAfterSeconds: FAILED_WINDOW_MS / 1000 });
  const count = await col.countDocuments({ ip, at: { $gt: new Date(Date.now() - FAILED_WINDOW_MS) } });
  return count >= MAX_FAILED_LOGINS;
}

export async function recordFailedLogin(ip: string): Promise<void> {
  const db = await getDb();
  await db.collection("login_failures").insertOne({ ip, at: new Date() });
}
