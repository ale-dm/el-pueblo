import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Psychic · Town · prioridad 4 · ficha: docs/roles/Psychic.md
export const handler: RoleHandler = {
  key: "psychic",
  name: "Psychic",
  faction: "town",
  priority: 4,
  nightAbilities: [{ key: "vision", target: "none", usesLimit: null }],
  dayAbilities: [],
  resolveNight: ({ ability, actor, targetId, secondTargetId }): Effect[] => {
    return [{ kind: "investigate", actorId: actor.id, targetId: null, check: "vision" }];
  },
};
