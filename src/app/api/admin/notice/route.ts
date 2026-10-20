import type { NextRequest } from "next/server";
import { clearNotice, setNotice } from "@/lib/rates";
import { broadcastChange } from "@/lib/realtime";
import { dbErrorResponse, guardAdmin, json, readJson, zodError } from "@/lib/http";
import { noticeSchema } from "@/lib/validation";

/** Show a notice (text, picture or video) full screen on every screen. */
export async function PUT(req: NextRequest) {
  const denied = guardAdmin(req);
  if (denied) return denied;
  const parsed = noticeSchema.safeParse(await readJson(req));
  if (!parsed.success) return zodError(parsed.error);
  try {
    const result = await setNotice(parsed.data);
    await broadcastChange(result.version);
    return json(result);
  } catch (err) {
    return dbErrorResponse(err);
  }
}

/** Remove the notice now; screens go back to the rates. */
export async function DELETE(req: NextRequest) {
  const denied = guardAdmin(req);
  if (denied) return denied;
  try {
    const result = await clearNotice();
    await broadcastChange(result.version);
    return json(result);
  } catch (err) {
    return dbErrorResponse(err);
  }
}
