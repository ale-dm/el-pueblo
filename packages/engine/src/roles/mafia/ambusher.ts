import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Ambusher · Mafia · prioridad 1 · ficha: docs/roles/Ambusher.md
export const handler: RoleHandler = {
  key: "ambusher",
  name: "Ambusher",
  faction: "mafia",
  priority: 1,
  nightAbilities: [{ key: "ambush", target: "player", usesLimit: null }],
  dayAbilities: [],
  resolveNight: ({ ability, actor, targetId, secondTargetId }): Effect[] => {
    switch (ability) {
      // Wiki (Ambusher.md:216-218): un visitante al azar; nunca otro miembro de la Mafia.
      case "ambush": return targetId ? [{ kind: "attackVisitors", actorId: actor.id, houseId: targetId, power: 1, cause: "ambush", single: true, spareMafia: true }] : [];
      default: return [];
    }
  },
};
