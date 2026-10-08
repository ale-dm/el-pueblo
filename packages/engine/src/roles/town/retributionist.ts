import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Retributionist · Town · prioridad 1 · ficha: docs/roles/Retributionist.md
export const handler: RoleHandler = {
  key: "retributionist",
  name: "Retributionist",
  faction: "town",
  priority: 1,
  nightAbilities: [{ key: "raise", target: "player", usesLimit: null }],
  dayAbilities: [],
  gaps: "Zombis que usan la habilidad de un Town muerto: no implementado en el MVP.",
  resolveNight: ({ ability, actor, targetId, secondTargetId }): Effect[] => {
    return [{ kind: "none", actorId: actor.id }];
  },
};
