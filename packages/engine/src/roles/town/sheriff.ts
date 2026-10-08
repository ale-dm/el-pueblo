import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Sheriff · Town · prioridad 4 · ficha: docs/roles/Sheriff.md
export const handler: RoleHandler = {
  key: "sheriff",
  name: "Sheriff",
  faction: "town",
  priority: 4,
  nightAbilities: [{ key: "interrogate", target: "player", usesLimit: null }],
  dayAbilities: [],
  resolveNight: ({ ability, actor, targetId, secondTargetId }): Effect[] => {
    switch (ability) {
      case "interrogate": return targetId ? [{ kind: "investigate", actorId: actor.id, targetId, check: "suspicious" }] : [];
      default: return [];
    }
  },
};
