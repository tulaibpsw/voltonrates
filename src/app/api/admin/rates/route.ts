import type { NextRequest } from "next/server";
import { createRate, deleteAllRates } from "@/lib/rates";
import { broadcastChange } from "@/lib/realtime";
import { dbErrorResponse, error, guardAdmin, json, readJson, zodError } from "@/lib/http";
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

/** Delete ALL products. The body must be { confirm: "DELETE ALL" } so it can't happen by accident. */
export async function DELETE(req: NextRequest) {
  const denied = guardAdmin(req);
  if (denied) return denied;
  const body = (await readJson(req)) as { confirm?: unknown } | null;
  if (body?.confirm !== "DELETE ALL") return error('Type "DELETE ALL" to confirm.', 400);
  try {
    const result = await deleteAllRates();
    await broadcastChange(result.version);
    return json(result);
  } catch (err) {
    return dbErrorResponse(err);
  }
}
