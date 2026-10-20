import { NextResponse, type NextRequest } from "next/server";
import type { ZodError } from "zod";
import { isAdmin, sameOrigin } from "./auth";

export const noStore = { "Cache-Control": "no-store, max-age=0" };

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: noStore });
}

export function error(message: string, status: number) {
  return json({ error: message }, status);
}

export function zodError(err: ZodError) {
  return json(
    {
      error: "Please check the form.",
      issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    },
    400,
  );
}

/** Returns an error response when the request is not an allowed admin call, otherwise null. */
export function guardAdmin(req: NextRequest) {
  if (!sameOrigin(req)) return error("Bad origin", 403);
  if (!isAdmin(req)) return error("Please log in again.", 401);
  return null;
}

export async function readJson(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export function dbErrorResponse(err: unknown) {
  console.error(err);
  return error("Could not reach the database. Please try again in a moment.", 503);
}
