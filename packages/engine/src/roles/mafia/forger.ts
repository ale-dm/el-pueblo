import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Forger · Mafia · prioridad 3 · ficha: docs/roles/Forger.md
export const handler: RoleHandler = {
  key: "forger",
  name: "Forger",
  faction: "mafia",
  priority: 3,
  nightAbilities: [{ key: "forge", target: "player", usesLimit: 2 }],
  dayAbilities: [],
  gaps: "Falsificación de últimas voluntades: no hay últimas voluntades en el MVP.",
  resolveNight: ({ ability, actor, targetId, secondTargetId }): Effect[] => {
    return [{ kind: "none", actorId: actor.id }];
  },
};
