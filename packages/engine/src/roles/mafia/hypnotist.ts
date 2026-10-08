import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Hypnotist · Mafia · prioridad 3 · ficha: docs/roles/Hypnotist.md
export const handler: RoleHandler = {
  key: "hypnotist",
  name: "Hypnotist",
  faction: "mafia",
  priority: 3,
  nightAbilities: [{ key: "hypnotize", target: "player", usesLimit: null }],
  dayAbilities: [],
  gaps: "Recuerdos plantados que confunden a la víctima: no implementado en el MVP.",
  resolveNight: ({ ability, actor, targetId, secondTargetId }): Effect[] => {
    return [{ kind: "none", actorId: actor.id }];
  },
};
