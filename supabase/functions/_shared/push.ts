import webpush from 'npm:web-push@3.6.7';

type PushSubscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type PushPayload = {
  title: string;
  body: string;
  taskId: string;
  url?: string;
};

export type PushResult = {
  ok: number;
  gone: string[];      // subscription IDs that returned 404/410 — should be deleted
  failed: { id: string; status: number; message: string }[];
};

export function configureWebPush() {
  const publicKey  = Deno.env.get('VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const subject    = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@mesimot.local';

  if (!publicKey || !privateKey) {
    throw new Error('Missing VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY env');
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export async function sendToAll(
  subs: PushSubscription[],
  payload: PushPayload,
): Promise<PushResult> {
  const result: PushResult = { ok: 0, gone: [], failed: [] };

  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
        { TTL: 60 * 60 * 24 },
      );
      result.ok++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode ?? 0;
      if (status === 404 || status === 410) {
        result.gone.push(s.id);
      } else {
        result.failed.push({ id: s.id, status, message: (err as Error).message });
      }
    }
  }));

  return result;
}
