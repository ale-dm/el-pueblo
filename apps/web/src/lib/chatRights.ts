import type { Channel, MatchView } from "../types.js";

/** Susurros: de día, entre vivos, si no estás silenciado. Refleja rules/chat.ts. */
const canWhisper = (view: MatchView) =>
  view.me.status === "alive" && !view.me.flags.blackmailed && view.players.some((p) => p.status === "alive" && p.id !== view.me.id);

/** Canales donde puede escribir ahora y, si ninguno, por qué. Refleja las reglas del motor (rules/chat.ts). */
export function chatRights(view: MatchView): { channels: Channel[]; notice: string | null } {
  const me = view.me;
  // Muerto: Ultratumba siempre; la sesión con un vivo solo si el Médium la ha abierto esta noche.
  if (me.status === "dead") {
    const seance: Channel[] = view.phase === "night" && me.seance === "medium" ? ["seance"] : [];
    return { channels: ["dead", ...seance], notice: null };
  }
  if (me.status !== "alive" || view.phase === "ended") return { channels: [], notice: null };
  if (view.phase === "night") {
    // La Mafia, el canal con el prisionero (o el Jailor) y la sesión de Médium funcionan de noche.
    const open: Channel[] = [
      ...(me.faction === "mafia" ? ["mafia" as const] : []),
      ...(me.jail ? ["jail" as const] : []),
      ...(me.seance === "target" ? ["seance" as const] : []),
    ];
    return open.length ? { channels: open, notice: null } : { channels: [], notice: "De noche solo habla la Mafia." };
  }
  if (me.flags.blackmailed) return { channels: [], notice: "Estás silenciado durante el día." };
  if ((view.phase === "defense" || view.phase === "last_words") && view.defendantId !== me.id) {
    return { channels: [], notice: "Solo habla el acusado." };
  }
  const channels: Channel[] = ["public"];
  if (canWhisper(view)) channels.push("whisper");
  if (view.me.jail) channels.push("jail");
  return { channels, notice: null };
}
