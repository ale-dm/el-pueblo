import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Spy · Town · prioridad 6 · ficha: docs/roles/Spy.md
export const handler: RoleHandler = {
  key: "spy",
  name: "Spy",
  faction: "town",
  priority: 6,
  nightAbilities: [{ key: "bug", target: "none", usesLimit: null }],
  dayAbilities: [],
  gaps: "Simplificación: el Spy ve las visitas de la Mafia y no una casa concreta.",
  resolveNight: ({ ability, actor, targetId, secondTargetId }): Effect[] => {
    return [{ kind: "investigate", actorId: actor.id, targetId: null, check: "mafiaVisits" }];
  },
};
