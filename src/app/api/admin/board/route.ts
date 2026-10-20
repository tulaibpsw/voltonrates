import type { NextRequest } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getBoard } from "@/lib/rates";
import { dbErrorResponse, error, json } from "@/lib/http";

// Admin view of the board: includes hidden (inactive) rates. Also tells the page whether we are logged in.
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return error("Please log in.", 401);
  try {
    return json(await getBoard({ includeInactive: true }));
  } catch (err) {
    return dbErrorResponse(err);
  }
}
