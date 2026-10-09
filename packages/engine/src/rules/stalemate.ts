import type { FactionKey } from "../types/factions.js";
import type { GameState } from "../types/state.js";

/**
 * Detector de empate (stalemate) para dos jugadores vivos de facciones opuestas, solo con roles MVP.
 *
 * Fuente: docs/wiki/Victory_ToS.md, sección Stalemate (:393-395): "In the event that the final two players happen to be of
 * opposing factions, the stalemate detector may activate, rewarding an automatic win to one of those players or factions."
 * La tabla (:397-1030) está en docs/wiki/Victory_ToS.md; la celda dice quién gana y las vacías siguen la partida.
 * Se reconstruye cruzando las filas y columnas (la matriz es simétrica salvo Necromancer, que no es MVP). Líneas de cada celda:
 *   Godfather vs Jailor (:542), Godfather vs Tavern Keeper (:540), Godfather vs Transporter (:538),
 *   Mafioso vs Transporter (:574, "Town"), Mafioso vs Tavern Keeper (:576), Mafioso vs Jailor (:578).
 *   Las mismas celdas aparecen en la fila de cada rol: Transporter (:642, :644), Tavern Keeper (:678, :680), Jailor (:714, :716).
 * Celdas vacías entre roles MVP (Veteran con cualquiera; Transporter con Tavern Keeper o Jailor; Tavern Keeper con Jailor):
 * la partida sigue, sin victoria automática.
 *
 * Reglas que modifican el resultado:
 * - "A player being Trapped also prevents the stalemate from being activated." (Victory_ToS.md:395): una trampa puesta
 *   sobre uno de los dos impide el detector. Una trampa construida y no colocada no cuenta.
 * - "If the Jailor has executions left, the stalemate detector will not grant an automatic victory to their opponent,
 *   and the game will continue." (Victory_ToS.md:1030).
 * - "A Mafia member will win in a 1 v 1 situation against a Tavern Keeper or the Jailor without executions." (Victory_ToS.md:39):
 *   cualquier miembro de la Mafia MVP gana frente a Tavern Keeper o Jailor, aunque no esté en la tabla.
 */
type StalemateWinner = Extract<FactionKey, "town" | "mafia">;

/** Pares de roles MVP con victoria automática. Orden irrelevante: se busca en los dos sentidos. */
export const STALEMATE_WINNERS: ReadonlyArray<readonly [roleA: string, roleB: string, winner: StalemateWinner]> = [
  ["godfather", "jailor", "mafia"],
  ["godfather", "tavern_keeper", "mafia"],
  ["godfather", "transporter", "mafia"],
  ["mafioso", "transporter", "town"],
  ["mafioso", "tavern_keeper", "mafia"],
  ["mafioso", "jailor", "mafia"],
];

/** Victoria automática por empate entre dos vivos, o null si el detector no se activa. */
export function checkStalemate(s: Pick<GameState, "players" | "traps">): FactionKey | null {
  const alive = s.players.filter((p) => p.status === "alive");
  if (alive.length !== 2) return null;
  const [a, b] = alive as [typeof alive[number], typeof alive[number]];
  if (!a.roleKey || !b.roleKey || !a.faction || !b.faction || a.faction === b.faction) return null;

  // Wiki (Victory_ToS.md:395): una trampa puesta sobre cualquiera de los dos impide el detector.
  if (Object.values(s.traps).some((t) => t.targetId === a.id || t.targetId === b.id)) return null;

  // Wiki (Victory_ToS.md:1030): con ejecuciones, el Jailor impide la victoria automática de su rival.
  const jailorWithExecutions = [a, b].some((p) => p.roleKey === "jailor" && (p.usesLeft["execute"] ?? 0) > 0 && p.flags.noExecute !== true);
  if (jailorWithExecutions) return null;

  const entry = STALEMATE_WINNERS.find(([x, y]) => (x === a.roleKey && y === b.roleKey) || (x === b.roleKey && y === a.roleKey));
  if (entry) return entry[2];

  // Wiki (Victory_ToS.md:39): "A Mafia member will win in a 1 v 1 situation against a Tavern Keeper or the Jailor without executions."
  // Vale para cualquier miembro de la Mafia, no solo para los de la tabla.
  const mafiaMember = [a, b].find((p) => p.faction === "mafia");
  const rival = mafiaMember === a ? b : a;
  if (mafiaMember && (rival.roleKey === "tavern_keeper" || rival.roleKey === "jailor")) return "mafia";
  return null;
}
