import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Bodyguard · Town · prioridad 3 · ficha: docs/roles/Bodyguard.md
export const handler: RoleHandler = {
  key: "bodyguard",
  name: "Bodyguard",
  faction: "town",
  priority: 3,
  nightAbilities: [{ key: "protect", target: "player", usesLimit: null }],
  dayAbilities: [],
  resolveNight: ({ ability, actor, targetId, secondTargetId }): Effect[] => {
    switch (ability) {
      case "protect": return targetId ? [{ kind: "protect", actorId: actor.id, targetId, power: 2, source: "bodyguard" }] : [];
      default: return [];
    }
  },
};
