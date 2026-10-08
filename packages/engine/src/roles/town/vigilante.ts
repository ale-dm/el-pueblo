import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Vigilante · Town · prioridad 5 · ficha: docs/roles/Vigilante.md
export const handler: RoleHandler = {
  key: "vigilante",
  name: "Vigilante",
  faction: "town",
  priority: 5,
  nightAbilities: [{ key: "shoot", target: "player", usesLimit: 3 }],
  dayAbilities: [],
  resolveNight: ({ ability, actor, targetId, secondTargetId }): Effect[] => {
    switch (ability) {
      case "shoot": return targetId ? [{ kind: "attack", actorId: actor.id, targetId, power: 1, cause: "shot" }] : [];
      default: return [];
    }
  },
};
