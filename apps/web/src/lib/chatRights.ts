import type { Channel, MatchView } from "../types.js";

/** Susurros: de día, entre vivos, si no estás silenciado. Refleja rules/chat.ts. */
const canWhisper = (view: MatchView) =>
  view.me.status === "alive" && !view.me.flags.blackmailed && view.players.some((p) => p.status === "alive" && p.id !== view.me.id);

/** Canales donde puede escribir ahora y, si ninguno, por qué. Refleja las reglas del motor (rules/chat.ts). */
export function chatRights(view: MatchView): { channels: Channel[]; notice: string | null } {
  const me = view.me;
  if (me.status === "dead") return { channels: ["dead"], notice: null };
  if (me.status !== "alive" || view.phase === "ended") return { channels: [], notice: null };
  if (view.phase === "night") {
    // El canal con el prisionero (o el Jailor) funciona también de noche.
    const jailChannel: Channel[] = me.jail ? ["jail"] : [];
    if (me.faction === "mafia") return { channels: ["mafia", ...jailChannel], notice: null };
    return jailChannel.length
      ? { channels: jailChannel, notice: null }
      : { channels: [], notice: "De noche solo habla la Mafia." };
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
