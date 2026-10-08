import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Tracker · Town · prioridad 3 · ficha: docs/roles/Tracker.md
export const handler: RoleHandler = {
  key: "tracker",
  name: "Tracker",
  faction: "town",
  priority: 3,
  nightAbilities: [{ key: "track", target: "player", usesLimit: null }],
  dayAbilities: [],
  resolveNight: ({ ability, actor, targetId, secondTargetId }): Effect[] => {
    switch (ability) {
      case "track": return targetId ? [{ kind: "investigate", actorId: actor.id, targetId, check: "targets" }] : [];
      default: return [];
    }
  },
};
