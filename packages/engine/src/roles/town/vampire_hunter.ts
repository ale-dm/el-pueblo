import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Vampire Hunter · Town · prioridad 5 · ficha: docs/roles/Vampire_Hunter.md
export const handler: RoleHandler = {
  key: "vampire_hunter",
  name: "Vampire Hunter",
  faction: "town",
  priority: 5,
  nightAbilities: [{ key: "check", target: "none", usesLimit: null }],
  dayAbilities: [],
  gaps: "Sin Vampiros en el MVP: la habilidad no tiene efecto.",
  resolveNight: ({ ability, actor, targetId, secondTargetId }): Effect[] => {
    return [{ kind: "none", actorId: actor.id }];
  },
};
