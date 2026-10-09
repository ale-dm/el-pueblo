import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Investigator · Town · prioridad 4 · ficha: docs/roles/Investigator.md
export const handler: RoleHandler = {
  key: "investigator",
  name: "Investigator",
  faction: "town",
  priority: 4,
  nightAbilities: [{ key: "investigate", target: "player", usesLimit: null }],
  dayAbilities: [],
  resolveNight: ({ ability, actor, targetId, secondTargetId }): Effect[] => {
    switch (ability) {
      case "investigate": return targetId ? [{ kind: "investigate", actorId: actor.id, targetId, check: "group" }] : [];
      default: return [];
    }
  },
};
