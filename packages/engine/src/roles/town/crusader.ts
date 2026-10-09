import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Crusader · Town · prioridad 3 · ficha: docs/roles/Crusader.md
export const handler: RoleHandler = {
  key: "crusader",
  name: "Crusader",
  faction: "town",
  priority: 3,
  nightAbilities: [{ key: "protect", target: "player", usesLimit: null }],
  dayAbilities: [],
  resolveNight: ({ ability, actor, targetId, secondTargetId }): Effect[] => {
    switch (ability) {
      case "protect": return targetId ? [{ kind: "protect", actorId: actor.id, targetId, power: 2, source: "crusader" }, { kind: "attackVisitors", actorId: actor.id, houseId: targetId, power: 1, cause: "crusade", single: true }] : [];
      default: return [];
    }
  },
};
