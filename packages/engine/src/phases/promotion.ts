import type { EventInput } from "../types/events.js";
import type { GameState, PlayerState } from "../types/state.js";
import { ROLE_HANDLERS } from "../roles/registry.js";

/** Roles de la Mafia que matan (wiki: Godfather, Mafioso, Ambusher: "Mafia Killing"). */
const KILLER_ROLES = new Set(["godfather", "mafioso", "ambusher"]);

/** Usos iniciales de un rol (para el evento role.promoted). */
const usesOf = (roleKey: string): Record<string, number> => {
  const uses: Record<string, number> = {};
  const handler = ROLE_HANDLERS.get(roleKey);
  for (const a of [...(handler?.nightAbilities ?? []), ...(handler?.dayAbilities ?? [])]) {
    if (a.usesLimit !== null) uses[a.key] = a.usesLimit;
  }
  return uses;
};

/**
 * Ascensos de la Mafia tras las muertes (`dead` incluye a quien acaba de morir):
 * - Sin Godfather vivo y con Mafioso vivo, el Mafioso pasa a Godfather (wiki: Godfather, Mafioso).
 * - Si no queda ningún rol que mate (Godfather, Mafioso, Ambusher), asciende a Mafioso el Bootlegger vivo
 *   si lo hay ("always the first Mafia member to be promoted", wiki: Bootlegger); si no, el de menor asiento.
 * Devuelve [] si no hace falta ningún ascenso.
 */
export function promotionEvents(s: GameState, dead: ReadonlySet<string>): EventInput[] {
  const mafiaAlive = s.players.filter((p) => p.faction === "mafia" && p.status === "alive" && !dead.has(p.id) && p.roleKey);
  const bySeat = (a: PlayerState, b: PlayerState) => a.seat - b.seat;
  const withRole = (key: string) => mafiaAlive.filter((p) => p.roleKey === key).sort(bySeat);

  const mafiosos = withRole("mafioso");
  if (withRole("godfather").length === 0 && mafiosos.length > 0) {
    const next = mafiosos[0]!;
    return [{ type: "role.promoted", payload: { playerId: next.id, roleKey: "godfather", uses: usesOf("godfather") } }];
  }

  if (mafiaAlive.some((p) => KILLER_ROLES.has(p.roleKey!))) return [];
  const successor = withRole("bootlegger")[0] ?? [...mafiaAlive].sort(bySeat)[0];
  if (!successor) return [];
  return [{ type: "role.promoted", payload: { playerId: successor.id, roleKey: "mafioso", uses: usesOf("mafioso") } }];
}
