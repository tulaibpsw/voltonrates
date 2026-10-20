import type { NextRequest } from "next/server";
import { createRate } from "@/lib/rates";
import { broadcastChange } from "@/lib/realtime";
import { dbErrorResponse, guardAdmin, json, readJson, zodError } from "@/lib/http";
import { rateCreateSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const denied = guardAdmin(req);
  if (denied) return denied;
  const parsed = rateCreateSchema.safeParse(await readJson(req));
  if (!parsed.success) return zodError(parsed.error);
  try {
    const { rate, version } = await createRate(parsed.data);
    await broadcastChange(version);
    return json({ rate, version }, 201);
  } catch (err) {
    return dbErrorResponse(err);
  }
}
