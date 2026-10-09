import type { Channel, MatchView } from "../types.js";

/** Canales donde puede escribir ahora y, si ninguno, por qué. Refleja las reglas del motor (rules/chat.ts). */
export function chatRights(view: MatchView): { channels: Channel[]; notice: string | null } {
  const me = view.me;
  if (me.status === "dead") return { channels: ["dead"], notice: null };
  if (me.status !== "alive" || view.phase === "ended") return { channels: [], notice: null };
  if (view.phase === "night") {
    return me.faction === "mafia"
      ? { channels: ["mafia"], notice: null }
      : { channels: [], notice: "De noche solo habla la Mafia." };
  }
  if (me.flags.blackmailed) return { channels: [], notice: "Estás silenciado durante el día." };
  if ((view.phase === "defense" || view.phase === "last_words") && view.defendantId !== me.id) {
    return { channels: [], notice: "Solo habla el acusado." };
  }
  return { channels: ["public"], notice: null };
}
