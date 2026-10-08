import { call } from "./socket.js";

export type PushStatus = "enabled" | "denied" | "unsupported" | "disabled" | "ios-needs-install";

/** En iPhone, los avisos solo funcionan con la app añadida a la pantalla de inicio (iOS 16.4 o superior). */
export function isIosBrowser(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(navigator as { standalone?: boolean }).standalone;
}

function base64UrlToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=").replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/**
 * Pide permiso y registra la suscripción de este dispositivo para la partida.
 * Debe llamarse desde un gesto del usuario (botón), o el navegador lo bloquea.
 */
export async function enablePush(matchId: string, token: string): Promise<PushStatus> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return isIosBrowser() ? "ios-needs-install" : "unsupported";
  }
  const { publicKey } = await call<{ publicKey: string | null }>("push:key", {});
  if (!publicKey) return "disabled";
  if ((await Notification.requestPermission()) !== "granted") return "denied";

  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(publicKey) }));
  const json = subscription.toJSON();
  await call("push:subscribe", {
    matchId,
    token,
    subscription: { endpoint: json.endpoint, keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth } },
  });
  return "enabled";
}

export const PUSH_MESSAGE: Record<PushStatus, string> = {
  enabled: "Avisos activados: te avisaremos al amanecer y al caer la noche.",
  denied: "Has bloqueado los avisos. Puedes cambiarlo en los ajustes del navegador.",
  unsupported: "Este navegador no admite avisos.",
  disabled: "Los avisos no están configurados en este servidor.",
  "ios-needs-install": "En iPhone, añade El Pueblo a la pantalla de inicio para recibir avisos.",
};
