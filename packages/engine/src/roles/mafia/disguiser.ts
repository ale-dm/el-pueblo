import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Disguiser · Mafia · prioridad 3 · ficha: docs/roles/Disguiser.md
export const handler: RoleHandler = {
  key: "disguiser",
  name: "Disguiser",
  faction: "mafia",
  priority: 3,
  nightAbilities: [{ key: "disguise", target: "player", usesLimit: null }],
  dayAbilities: [],
  gaps: "Disfraz de Mafia como Town para Investigator y Sheriff: no implementado en el MVP.",
  resolveNight: ({ ability, actor, targetId, secondTargetId }): Effect[] => {
    return [{ kind: "none", actorId: actor.id }];
  },
};
