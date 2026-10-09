import type { GameState } from "../types/state.js";

export type ChatChannel = "public" | "mafia" | "dead" | "whisper" | "jail" | "seance";

/**
 * Sesión de Médium: el Médium (muerto) habla esta noche con un vivo que ha elegido. Devuelve con quién
 * habla quien envía, o null si no hay sesión abierta.
 */
export function seanceRecipient(state: GameState, senderId: string): string | null {
  if (state.phase !== "night") return null;
  const own = state.nightActions[senderId];
  if (own?.ability === "seance" && own.targetId) {
    const target = state.players.find((p) => p.id === own.targetId);
    return target?.status === "alive" ? target.id : null;
  }
  const medium = Object.keys(state.nightActions).find((id) => {
    const action = state.nightActions[id]!;
    return action.ability === "seance" && action.targetId === senderId;
  });
  return medium ?? null;
}

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
  if (channel === "seance") {
    if (!seanceRecipient(state, senderId)) return "No hay ninguna sesión abierta esta noche";
    return null;
  }
  if (channel === "jail") {
    // Jailor y prisionero hablan en privado (anónimo para el prisionero), mientras dure el encarcelamiento.
    const jailor = state.jailedBy[senderId];
    const prisoner = Object.keys(state.jailedBy).find((id) => state.jailedBy[id] === senderId);
    if (!jailor && !prisoner) return "No tienes a nadie encarcelado ni te han encarcelado";
    const other = jailor ?? prisoner!;
    const otherPlayer = state.players.find((p) => p.id === other);
    if (!otherPlayer || otherPlayer.status !== "alive") return "La otra persona ya no está viva";
    return null;
  }
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
  if (channel === "dead") {
    if (sender.status === "dead") return null;
    // Wiki (Medium.md:186, 189): el Médium vivo habla con los muertos cada noche. Encarcelado, los muertos no le oyen (Medium.md:201).
    if (sender.roleKey === "medium" && state.phase === "night" && !sender.flags.jailed) return null;
    if (sender.roleKey === "medium" && sender.flags.jailed) return "Encarcelado, los muertos no te oyen";
    return "Solo hablan los muertos en este canal";
  }
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
