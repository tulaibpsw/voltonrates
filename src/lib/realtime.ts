import Pusher from "pusher";

export const RATES_CHANNEL = "rates";
export const RATES_EVENT = "changed";

let pusher: Pusher | null | undefined;

function getPusher(): Pusher | null {
  if (pusher !== undefined) return pusher;
  const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } = process.env;
  pusher =
    PUSHER_APP_ID && PUSHER_KEY && PUSHER_SECRET && PUSHER_CLUSTER
      ? new Pusher({ appId: PUSHER_APP_ID, key: PUSHER_KEY, secret: PUSHER_SECRET, cluster: PUSHER_CLUSTER, useTLS: true })
      : null;
  return pusher;
}

export function realtimeEnabled(): boolean {
  return getPusher() !== null;
}

/**
 * Tell every open screen that prices changed. Screens then re-fetch /api/rates.
 * We only send a small signal (not the whole board) so we never hit Pusher's 10 KB message limit.
 * Failure here must not fail the admin's save: screens also poll as a backup.
 */
export async function broadcastChange(version: number): Promise<void> {
  const p = getPusher();
  if (!p) return;
  try {
    await p.trigger(RATES_CHANNEL, RATES_EVENT, { version });
  } catch (err) {
    console.error("[realtime] Pusher trigger failed", err);
  }
}
