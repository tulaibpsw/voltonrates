import type { NextRequest } from "next/server";
import { deleteRate, getHistory, updateRate } from "@/lib/rates";
import { broadcastChange } from "@/lib/realtime";
import { dbErrorResponse, error, guardAdmin, json, readJson, zodError } from "@/lib/http";
import { isAdmin } from "@/lib/auth";
import { rateUpdateSchema } from "@/lib/validation";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/admin/rates/[id]">) {
  if (!isAdmin(req)) return error("Please log in.", 401);
  const { id } = await ctx.params;
  try {
    return json({ history: await getHistory(id) });
  } catch (err) {
    return dbErrorResponse(err);
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/admin/rates/[id]">) {
  const denied = guardAdmin(req);
  if (denied) return denied;
  const parsed = rateUpdateSchema.safeParse(await readJson(req));
  if (!parsed.success) return zodError(parsed.error);
  const { id } = await ctx.params;
  try {
    const result = await updateRate(id, parsed.data);
    if (!result) return error("This item no longer exists.", 404);
    await broadcastChange(result.version);
    return json(result);
  } catch (err) {
    return dbErrorResponse(err);
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/admin/rates/[id]">) {
  const denied = guardAdmin(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  try {
    const result = await deleteRate(id);
    if (!result) return error("This item no longer exists.", 404);
    await broadcastChange(result.version);
    return json(result);
  } catch (err) {
    return dbErrorResponse(err);
  }
}
