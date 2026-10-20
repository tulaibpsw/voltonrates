import type { NextRequest } from "next/server";
import { getBoard } from "@/lib/rates";
import { dbErrorResponse, json } from "@/lib/http";

// Public: the LCD screens read the board from here.
export async function GET(req: NextRequest) {
  // Reading the URL marks this as request-time, so prices are never prerendered.
  void req.nextUrl.searchParams;
  try {
    return json(await getBoard());
  } catch (err) {
    return dbErrorResponse(err);
  }
}
