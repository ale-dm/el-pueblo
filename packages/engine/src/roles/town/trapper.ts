import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Trapper · Town · prioridad 1 · ficha: docs/roles/Trapper.md
export const handler: RoleHandler = {
  key: "trapper",
  name: "Trapper",
  faction: "town",
  priority: 1,
  // Wiki (Trapper.md:46): "Traps can be torn down by selecting yourself at night."
  nightAbilities: [{ key: "trap", target: "player", usesLimit: null, selfAllowed: true }],
  dayAbilities: [],
  resolveNight: ({ ability, actor, targetId, secondTargetId }): Effect[] => {
    switch (ability) {
      case "trap": return targetId ? [{ kind: "trap", actorId: actor.id, targetId }] : [];
      default: return [];
    }
  },
};
