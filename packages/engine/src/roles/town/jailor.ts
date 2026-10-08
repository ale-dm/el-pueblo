import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Jailor · Town · prioridad 1 · ficha: docs/roles/Jailor.md
export const handler: RoleHandler = {
  key: "jailor",
  name: "Jailor",
  faction: "town",
  priority: 1,
  nightAbilities: [{ key: "execute", target: "player", usesLimit: 3 }],
  dayAbilities: [{ key: "jail", target: "player", oncePerDay: true, usesLimit: null }],
  resolveNight: ({ ability, actor, targetId, secondTargetId }): Effect[] => {
    switch (ability) {
      case "execute": return targetId ? [{ kind: "attack", actorId: actor.id, targetId, power: 2, cause: "execute" }] : [];
      default: return [];
    }
  },
};
