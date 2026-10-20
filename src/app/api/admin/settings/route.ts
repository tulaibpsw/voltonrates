import type { NextRequest } from "next/server";
import { saveSettings } from "@/lib/rates";
import { broadcastChange } from "@/lib/realtime";
import { dbErrorResponse, guardAdmin, json, readJson, zodError } from "@/lib/http";
import { settingsSchema } from "@/lib/validation";

export async function PUT(req: NextRequest) {
  const denied = guardAdmin(req);
  if (denied) return denied;
  const parsed = settingsSchema.safeParse(await readJson(req));
  if (!parsed.success) return zodError(parsed.error);
  try {
    const { version } = await saveSettings(parsed.data);
    await broadcastChange(version);
    return json({ settings: parsed.data, version });
  } catch (err) {
    return dbErrorResponse(err);
  }
}
