import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Forger · Mafia · prioridad 3 · ficha: docs/roles/Forger.md
export const handler: RoleHandler = {
  key: "forger",
  name: "Forger",
  faction: "mafia",
  priority: 3,
  // Falsifica la última voluntad de un jugador: si muere, se muestra como el rol elegido. Dos usos.
  nightAbilities: [{ key: "forge", target: "player", usesLimit: 2, choices: "roles" }],
  dayAbilities: [],
  gaps: "El texto del testamento falsificado es genérico; la wiki no fija un texto.",
  resolveNight: ({ ability, actor, targetId, choice }): Effect[] => {
    if (ability !== "forge" || !targetId || !choice) return [];
    return [{ kind: "forge", actorId: actor.id, targetId, role: choice }];
  },
};
