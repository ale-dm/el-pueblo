import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Mayor · Town · prioridad null · ficha: docs/roles/Mayor.md
export const handler: RoleHandler = {
  key: "mayor",
  name: "Mayor",
  faction: "town",
  priority: null,
  nightAbilities: [],
  dayAbilities: [{ key: "reveal", target: "none", oncePerDay: false, usesLimit: 1 }],
  resolveNight: ({ ability, actor, targetId, secondTargetId }): Effect[] => {
    return [];
  },
};
