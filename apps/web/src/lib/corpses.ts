import type { MatchView, PublicPlayer } from "../types.js";

/**
 * ¿Mostrar el icono de cuerpo usado junto a este muerto? Wiki (Retributionist.md:204): "The icon that displays next to a
 * player in the graveyard after you have used their body". Solo para el Retributionist que lo usó (`me.usedBodies`, que
 * el servidor rellena solo para él) y solo en la fila de muertos.
 */
export function usedBodyMark(view: Pick<MatchView, "me">, p: Pick<PublicPlayer, "id" | "status">): boolean {
  return p.status === "dead" && view.me.usedBodies.includes(p.id);
}
