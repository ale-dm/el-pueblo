import type { GameState } from "../types/state.js";

export type ChatChannel = "public" | "mafia" | "dead";

const DAY_PHASES = new Set(["day_1", "discussion", "voting", "defense", "judgement", "last_words"]);

/**
 * ¿Puede escribir este jugador en este canal ahora? Devuelve el motivo si no.
 * - dead: solo muertos, en cualquier fase.
 * - mafia: solo Mafia viva, de noche.
 * - public: vivos y no silenciados, de día. En defensa y últimas palabras solo habla el acusado.
 *   SUPUESTO: en juicio puede hablar todo el mundo (la wiki no lo especifica en este punto).
 */
export function chatDenied(state: GameState, senderId: string, channel: ChatChannel): string | null {
  const sender = state.players.find((p) => p.id === senderId);
  if (!sender) return "Jugador desconocido";
  if (channel === "dead") return sender.status === "dead" ? null : "Solo hablan los muertos en este canal";
  if (sender.status !== "alive") return "Los muertos no hablan en este canal";
  if (channel === "mafia") {
    if (state.phase !== "night") return "El chat de la Mafia solo está abierto de noche";
    return sender.faction === "mafia" ? null : "Solo la Mafia habla en este canal";
  }
  if (!DAY_PHASES.has(state.phase)) return "El chat público está cerrado en esta fase";
  if (sender.flags.blackmailed) return "Estás silenciado durante el día";
  if ((state.phase === "defense" || state.phase === "last_words") && state.defendantId !== senderId) {
    return "Solo habla el acusado en esta fase";
  }
  return null;
}
