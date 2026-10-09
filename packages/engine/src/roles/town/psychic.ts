import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Psychic · Town · prioridad 4 · ficha: docs/roles/Psychic.md
export const handler: RoleHandler = {
  key: "psychic",
  name: "Psychic",
  faction: "town",
  priority: 4,
  // Pasiva: recibe su visión cada noche sin elegir nada (wiki: Psychic). No se ofrece como acción.
  passive: true,
  nightAbilities: [],
  dayAbilities: [],
  resolveNight: ({ ability, actor, targetId, secondTargetId }): Effect[] => {
    return [{ kind: "investigate", actorId: actor.id, targetId: null, check: "vision" }];
  },
};
