import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Disguiser · Mafia · prioridad 3 · ficha: docs/roles/Disguiser.md
export const handler: RoleHandler = {
  key: "disguiser",
  name: "Disguiser",
  faction: "mafia",
  priority: 3,
  // Disfraza a un Mafioso de alguien que no es de la Mafia: el Investigador y el Sheriff ven ese rol.
  nightAbilities: [{ key: "disguise", target: "two", usesLimit: null }],
  dayAbilities: [],
  gaps: "El Spy no descarta las visitas de un Mafioso disfrazado de Town (simplificación).",
  resolveNight: ({ ability, actor, targetId, secondTargetId }): Effect[] => {
    if (ability !== "disguise" || !targetId || !secondTargetId) return [];
    return [{ kind: "disguise", actorId: actor.id, targetId, asId: secondTargetId }];
  },
};
