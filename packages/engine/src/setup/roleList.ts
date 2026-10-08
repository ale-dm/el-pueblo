import type { Catalog } from "../types/catalog.js";
import type { Rng } from "../core/rng.js";
import { mafiaCountFor } from "./limits.js";

/**
 * Lista de roles para una partida de Mafia (MVP): el Godfather siempre está, el resto de la Mafia
 * sale de su grupo, y el Pueblo se completa con roles de Town sin repetir los únicos.
 * Las reglas del host (Custom) se aplican antes, en setup/validateConfig.ts.
 */
export function buildRoleList(playerCount: number, catalog: Catalog, rng: Rng): string[] {
  const mafiaTotal = mafiaCountFor(playerCount);
  const mvp = [...catalog.roles.values()].filter((r) => r.mvp);
  const mafiaPool = mvp.filter((r) => r.faction === "mafia" && r.key !== "godfather").map((r) => r.key);
  const townPool = mvp.filter((r) => r.faction === "town");

  const mafia = ["godfather", ...rng.shuffle(mafiaPool).slice(0, mafiaTotal - 1)];

  const townKeys: string[] = [];
  const unique = new Set<string>();
  for (const role of rng.shuffle(townPool)) {
    if (townKeys.length === playerCount - mafiaTotal) break;
    if (role.isUnique && unique.has(role.key)) continue;
    townKeys.push(role.key);
    if (role.isUnique) unique.add(role.key);
  }
  if (townKeys.length < playerCount - mafiaTotal) {
    throw new RangeError(`buildRoleList: no hay suficientes roles de Town para ${playerCount} jugadores`);
  }
  return [...mafia, ...townKeys];
}
