import type { Channel, MatchView } from "../types.js";

/**
 * Susurros: se puede intentar de día, entre vivos. El motor responde al intento con el mensaje de la wiki si está
 * silenciado o si el destinatario es un Mayor revelado (Blackmailer.md:211; Mayor.md:397, 401), así que la UI deja intentarlo.
 */
const canWhisper = (view: MatchView) => view.me.status === "alive" && view.players.some((p) => whisperTarget(p, view.me.id));

/** A quién se puede susurrar (intentarlo): vivos y distintos de uno mismo. Un Mayor revelado también, para recibir el aviso. */
export const whisperTarget = (p: { id: string; status: string; mayorRevealed?: boolean }, meId: string) =>
  p.status === "alive" && p.id !== meId;

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

/**
 * Canales que el Médium con sesión solo lee: el de la Mafia o el de cárcel de su objetivo. Solo el objetivo habla en ellos
 * (wiki: Medium.md:217-219, "they will be able to talk with you and the Jailor, the other members of their faction ...").
 */
const seanceReadOnly = (target: MatchView["me"]["seanceTarget"]): Channel[] => [
  ...(target?.mafia ? ["mafia" as const] : []),
  ...(target?.jail ? ["jail" as const] : []),
];

/**
 * Canales donde puede escribir ahora y, si ninguno, por qué. `channels` son todos los que ve (escritura primero);
 * `readOnly` los que solo lee. Refleja las reglas del motor (rules/chat.ts y core/decide.ts).
 */
export function chatRights(view: MatchView): { channels: Channel[]; readOnly: Channel[]; notice: string | null } {
  const me = view.me;
  // Muerto: Ultratumba siempre; la sesión con un vivo solo si el Médium la ha abierto esta noche.
  if (me.status === "dead") {
    if (view.phase === "night" && me.seance === "medium") {
      // Wiki (Medium.md:223): "While seancing, you are still able to hear the dead, but the dead won't hear you."
      // Con sesión, el Ultratumba y el canal de la Mafia o de cárcel de su objetivo son de solo lectura (Medium.md:217-219, 223).
      const watch = seanceReadOnly(me.seanceTarget);
      return { channels: ["seance", "dead", ...watch], readOnly: ["dead", ...watch], notice: null };
    }
    return { channels: ["dead"], readOnly: [], notice: null };
  }
  if (me.status !== "alive" || view.phase === "ended") return { channels: [], readOnly: [], notice: null };
  if (view.phase === "night") {
    // La Mafia, el canal con el prisionero (o el Jailor), la sesión de Médium y el Ultratumba del Médium vivo.
    const open: Channel[] = [
      ...(me.faction === "mafia" ? ["mafia" as const] : []),
      ...(me.roleKey === "medium" && !me.flags.jailed ? ["dead" as const] : []),
      ...(me.jail ? ["jail" as const] : []),
      ...(me.seance === "target" ? ["seance" as const] : []),
    ];
    // Wiki (Medium.md:201): encarcelado, el Médium oye a los muertos, pero los muertos no le oyen (solo el Jailor le oye).
    const heard: Channel[] = me.roleKey === "medium" && me.flags.jailed ? ["dead"] : [];
    return open.length || heard.length
      ? { channels: [...open, ...heard], readOnly: heard, notice: null }
      : { channels: [], readOnly: [], notice: "De noche solo habla la Mafia." };
  }
  // Wiki (Blackmailer.md:213): el acusado silenciado solo dice "I am blackmailed." en su defensa, una vez por juicio.
  if (me.flags.blackmailed && view.phase === "defense" && view.defendantId === me.id && !me.flags.blackmailSpoke) {
    return { channels: ["public"], readOnly: [], notice: "Estás silenciado: en tu defensa solo puedes decir «I am blackmailed.»." };
  }
  // Wiki (Blackmailer.md:209, 211): el silenciado intenta hablar o susurrar y recibe el mensaje de la wiki; la UI lo deja intentar.
  if ((view.phase === "defense" || view.phase === "last_words") && view.defendantId !== me.id) {
    return { channels: [], readOnly: [], notice: "Solo habla el acusado." };
  }
  const channels: Channel[] = ["public"];
  if (canWhisper(view)) channels.push("whisper");
  if (view.me.jail) channels.push("jail");
  return { channels, readOnly: [], notice: null };
}
