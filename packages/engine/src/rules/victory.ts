import type { FactionKey } from "../types/factions.js";
import type { PlayerState } from "../types/state.js";

/**
 * Victoria en el MVP (solo Town y Mafia), según la wiki (Victory (ToS)):
 * - Town gana cuando no queda ningún miembro vivo de Mafia.
 * - Mafia gana cuando no queda ningún Town vivo.
 * Pendiente (fuera del MVP): reglas 1 contra 1, neutrales, Coven, empates.
 */
export function checkVictory(players: readonly PlayerState[]): FactionKey | null {
  const alive = players.filter((p) => p.status === "alive");
  const aliveMafia = alive.filter((p) => p.faction === "mafia").length;
  const aliveTown = alive.filter((p) => p.faction === "town").length;
  if (aliveMafia === 0) return "town";
  if (aliveTown === 0) return "mafia";
  return null;
}
