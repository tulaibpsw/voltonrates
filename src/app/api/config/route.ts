import type { NextRequest } from "next/server";
import { json } from "@/lib/http";

// Public realtime settings for the screens. The Pusher key and cluster are public by design.
export async function GET(req: NextRequest) {
  void req.nextUrl.searchParams;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY || process.env.PUSHER_KEY || "";
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || process.env.PUSHER_CLUSTER || "";
  return json({ pusher: key && cluster ? { key, cluster } : null });
}
