import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Consigliere · Mafia · prioridad 4 · ficha: docs/roles/Consigliere.md
export const handler: RoleHandler = {
  key: "consigliere",
  name: "Consigliere",
  faction: "mafia",
  priority: 4,
  nightAbilities: [{ key: "check", target: "player", usesLimit: null }],
  dayAbilities: [],
  resolveNight: ({ ability, actor, targetId, secondTargetId }): Effect[] => {
    switch (ability) {
      case "check": return targetId ? [{ kind: "investigate", actorId: actor.id, targetId, check: "role" }] : [];
      default: return [];
    }
  },
};
