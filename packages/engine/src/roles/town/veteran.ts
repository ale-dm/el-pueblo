import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Veteran · Town · prioridad 1 · ficha: docs/roles/Veteran.md
export const handler: RoleHandler = {
  key: "veteran",
  name: "Veteran",
  faction: "town",
  priority: 1,
  nightAbilities: [{ key: "alert", target: "none", usesLimit: 3 }],
  dayAbilities: [],
  roleblockImmune: true,
  resolveNight: ({ ability, actor, targetId, secondTargetId }): Effect[] => {
    switch (ability) {
      case "alert": return [{ kind: "alert", actorId: actor.id }];
      default: return [];
    }
  },
};
