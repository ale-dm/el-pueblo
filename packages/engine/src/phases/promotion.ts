import type { EventInput } from "../types/events.js";
import type { GameState } from "../types/state.js";
import { ROLE_HANDLERS } from "../roles/registry.js";

/** Roles de la Mafia que matan (wiki: Godfather y Mafioso). */
const KILLER_ROLES = new Set(["godfather", "mafioso"]);

/**
 * Ascenso (wiki: Hypnotist, Forger, Disguiser: "Becomes Mafioso when Mafia Killing are dead").
 * Si no queda ningún Mafioso que mate entre los vivos (`dead` incluye a quien acaba de morir),
 * el Mafioso de apoyo vivo con menor asiento se convierte en Mafioso. Devuelve [] si no hace falta.
 */
export function promotionEvents(s: GameState, dead: ReadonlySet<string>): EventInput[] {
  const mafiaAlive = s.players.filter((p) => p.faction === "mafia" && p.status === "alive" && !dead.has(p.id) && p.roleKey);
  if (mafiaAlive.some((p) => KILLER_ROLES.has(p.roleKey!))) return [];
  const successor = [...mafiaAlive].sort((a, b) => a.seat - b.seat)[0];
  const handler = ROLE_HANDLERS.get("mafioso");
  if (!successor || !handler) return [];
  const uses: Record<string, number> = {};
  for (const a of [...handler.nightAbilities, ...handler.dayAbilities]) {
    if (a.usesLimit !== null) uses[a.key] = a.usesLimit;
  }
  return [{ type: "role.promoted", payload: { playerId: successor.id, roleKey: "mafioso", uses } }];
}
