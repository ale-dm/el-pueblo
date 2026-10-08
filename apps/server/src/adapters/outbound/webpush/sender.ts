import webpush from "web-push";
import type { PushPayload, PushSender, PushSubscriptionRecord } from "../../../application/ports.js";

export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

/** Envío real con Web Push (VAPID). 404 y 410 significan que el navegador ya no tiene esa suscripción. */
export class WebPushSender implements PushSender {
  constructor(private readonly vapid: VapidConfig) {
    webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  }

  publicKey() {
    return this.vapid.publicKey;
  }

  async send(sub: PushSubscriptionRecord, payload: PushPayload) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
        { TTL: 60 },
      );
      return "sent" as const;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      return status === 404 || status === 410 ? ("gone" as const) : ("error" as const);
    }
  }
}

/** Sin claves VAPID no hay notificaciones: el juego funciona igual. */
export class NoPushSender implements PushSender {
  publicKey() {
    return null;
  }

  async send() {
    return "error" as const;
  }
}
