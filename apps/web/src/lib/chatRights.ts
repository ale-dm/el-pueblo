import type { Channel, MatchView } from "../types.js";

/** Susurros: de día, entre vivos, si no estás silenciado ni eres un Mayor revelado (wiki: Mayor.md:203). Refleja rules/chat.ts. */
const canWhisper = (view: MatchView) =>
  view.me.status === "alive" && !view.me.flags.blackmailed && !view.me.flags.mayorRevealed &&
  view.players.some((p) => whisperTarget(p, view.me.id));

/** A quién se puede susurrar: vivos, distintos de uno mismo y sin Mayor revelado. */
export const whisperTarget = (p: { id: string; status: string; mayorRevealed?: boolean }, meId: string) =>
  p.status === "alive" && p.id !== meId && !p.mayorRevealed;

/**
 * Quién aparece como autor de un mensaje. Los muertos ven al Médium vivo como "Medium" (wiki: Medium).
 * En la prisión el Jailor es anónimo para el prisionero, y al revés. Refleja el motor (core/decide.ts).
 */
export function chatSenderLabel(view: MatchView, p: Record<string, any>, nick: (id: string) => string): string {
  // El vivo que recibe la sesión de Médium no sabe quién es el Médium.
  if (p.channel === "seance" && p.senderId !== view.me.id && view.me.status === "alive") return "Médium";
  if (p.anonymous && p.senderId !== view.me.id) return "Medium";
  if (p.channel !== "jail" || p.senderId === view.me.id) return nick(p.senderId);
  return view.me.jail === "prisoner" ? "Carcelero" : "Prisionero";
}

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
    // La Mafia, el canal con el prisionero (o el Jailor), la sesión de Médium y el Ultratumba del Médium vivo.
    const open: Channel[] = [
      ...(me.faction === "mafia" ? ["mafia" as const] : []),
      ...(me.roleKey === "medium" && !me.flags.jailed ? ["dead" as const] : []),
      ...(me.jail ? ["jail" as const] : []),
      ...(me.seance === "target" ? ["seance" as const] : []),
    ];
    return open.length ? { channels: open, notice: null } : { channels: [], notice: "De noche solo habla la Mafia." };
  }
  // Wiki (Blackmailer.md:213): el acusado silenciado solo dice "I am blackmailed." en su defensa, una vez por juicio.
  if (me.flags.blackmailed && view.phase === "defense" && view.defendantId === me.id && !me.flags.blackmailSpoke) {
    return { channels: ["public"], notice: "Estás silenciado: en tu defensa solo puedes decir «I am blackmailed.»." };
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
