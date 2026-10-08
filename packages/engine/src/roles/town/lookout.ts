import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Lookout · Town · prioridad 4 · ficha: docs/roles/Lookout.md
export const handler: RoleHandler = {
  key: "lookout",
  name: "Lookout",
  faction: "town",
  priority: 4,
  nightAbilities: [{ key: "watch", target: "player", usesLimit: null }],
  dayAbilities: [],
  resolveNight: ({ ability, actor, targetId, secondTargetId }): Effect[] => {
    switch (ability) {
      case "watch": return targetId ? [{ kind: "investigate", actorId: actor.id, targetId, check: "visitors" }] : [];
      default: return [];
    }
  },
};
