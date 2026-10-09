import type { GameState } from "../types/state.js";

export type ChatChannel = "public" | "mafia" | "dead" | "whisper";

const DAY_PHASES = new Set(["day_1", "discussion", "voting", "defense", "judgement", "last_words"]);

/**
 * ¿Puede escribir este jugador en este canal ahora? Devuelve el motivo si no.
 * - dead: solo muertos, en cualquier fase.
 * - mafia: solo Mafia viva, de noche.
 * - public: vivos y no silenciados, de día. En defensa y últimas palabras solo habla el acusado.
 *   SUPUESTO: en juicio puede hablar todo el mundo (la wiki no lo especifica en este punto).
 */
export function chatDenied(state: GameState, senderId: string, channel: ChatChannel, recipientId?: string): string | null {
  const sender = state.players.find((p) => p.id === senderId);
  if (!sender) return "Jugador desconocido";
  if (channel === "whisper") {
    // Susurros: de día, entre dos vivos, sin silencio (wiki: Chat).
    if (!recipientId) return "Elige a quién susurrar";
    if (sender.status !== "alive") return "Los muertos no susurran";
    if (!DAY_PHASES.has(state.phase)) return "Los susurros solo son de día";
    if (sender.flags.blackmailed) return "Estás silenciado durante el día";
    const recipient = state.players.find((p) => p.id === recipientId);
    if (!recipient || recipient.status !== "alive") return "Solo puedes susurrar a alguien vivo";
    if (recipient.id === senderId) return "No puedes susurrarte a ti mismo";
    return null;
  }
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
