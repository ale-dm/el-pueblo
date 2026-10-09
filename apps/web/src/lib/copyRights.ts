import type { MatchView } from "../types.js";

/**
 * ¿Se puede copiar este mensaje del chat? Wiki (Medium.md:197): "You, as well as the dead, cannot copy your own messages
 * into the clipboard." (Ultratumba). Wiki (Medium.md:215): "You, as well as the target and other seancing Mediums, cannot
 * copy your own or other Medium's messages into the clipboard." (sesión de Médium). Supuesto: la sesión entera queda bloqueada
 * para quien participa, también los mensajes del objetivo que leen otros Médiums; la wiki no lo dice.
 */
export function copyBlocked(view: MatchView, message: { channel: string; senderId: string }): boolean {
  if (message.channel === "seance") return true;
  if (message.channel === "dead" && message.senderId === view.me.id) return true;
  return false;
}
