import type { EventInput } from "../types/events.js";
import type { GameState, PlayerState } from "../types/state.js";
import { ROLE_HANDLERS } from "../roles/registry.js";

/**
 * Roles que matan (grupo Mafia Killing, wiki: Mafia_Killing.md): Godfather, Mafioso y Ambusher.
 * Son los "kill-capable" que bloquean el ascenso de los demás Mafia (Mafia_Support.md, Bootlegger.md:218).
 * El Serial Killer no es Mafia y no entra aquí.
 */
const KILL_CAPABLE = new Set(["godfather", "mafioso", "ambusher"]);

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
 * Ascensos de la Mafia tras las muertes (`dead` incluye a quien acaba de morir), según Mafia_Killing.md y Mafia_Support.md:
 * 1. Sin Godfather vivo y con Mafioso vivo, el Mafioso pasa a Godfather.
 * 2. Sin Godfather ni Mafioso vivos, y con Ambusher vivo, el Ambusher asciende a Mafioso (Ambusher.md:228).
 * 3. Mientras quede algún rol Mafia Killing vivo, nadie más asciende.
 * 4. Si no queda ninguno, asciende a Mafioso el Bootlegger vivo ("the highest priority", Mafia_Killing.md);
 *    si no hay Bootlegger, el que entró primero al lobby (Mafia_Support.md: menor asiento).
 * Devuelve [] si no hace falta ningún ascenso.
 */
export function promotionEvents(s: GameState, dead: ReadonlySet<string>): EventInput[] {
  const mafiaAlive = s.players.filter((p) => p.faction === "mafia" && p.status === "alive" && !dead.has(p.id) && p.roleKey);
  const bySeat = (a: PlayerState, b: PlayerState) => a.seat - b.seat;
  const withRole = (key: string) => mafiaAlive.filter((p) => p.roleKey === key).sort(bySeat);

  const godfathers = withRole("godfather");
  const mafiosos = withRole("mafioso");
  const ambushers = withRole("ambusher");

  if (godfathers.length === 0 && mafiosos.length > 0) {
    return [{ type: "role.promoted", payload: { playerId: mafiosos[0]!.id, roleKey: "godfather", uses: usesOf("godfather") } }];
  }
  if (godfathers.length === 0 && mafiosos.length === 0 && ambushers.length > 0) {
    return [{ type: "role.promoted", payload: { playerId: ambushers[0]!.id, roleKey: "mafioso", uses: usesOf("mafioso") } }];
  }
  if (mafiaAlive.some((p) => KILL_CAPABLE.has(p.roleKey!))) return [];

  const successor = withRole("bootlegger")[0] ?? [...mafiaAlive].sort(bySeat)[0];
  if (!successor) return [];
  return [{ type: "role.promoted", payload: { playerId: successor.id, roleKey: "mafioso", uses: usesOf("mafioso") } }];
}
