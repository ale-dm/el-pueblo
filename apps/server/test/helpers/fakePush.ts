import type { PushPayload, PushSender, PushSubscriptionRecord } from "../../src/application/ports.js";

/** Envío simulado: anota lo enviado y permite marcar endpoints como caducados. */
export class FakePushSender implements PushSender {
  readonly sent: Array<{ endpoint: string; payload: PushPayload }> = [];
  readonly gone = new Set<string>();

  publicKey() {
    return "BFakeVapidPublicKey";
  }

  async send(sub: PushSubscriptionRecord, payload: PushPayload) {
    if (this.gone.has(sub.endpoint)) return "gone" as const;
    this.sent.push({ endpoint: sub.endpoint, payload });
    return "sent" as const;
  }
}
