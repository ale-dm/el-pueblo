import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Doctor · Town · prioridad 3 · ficha: docs/roles/Doctor.md
export const handler: RoleHandler = {
  key: "doctor",
  name: "Doctor",
  faction: "town",
  priority: 3,
  nightAbilities: [{ key: "heal", target: "player", usesLimit: null, selfAllowed: true }],
  dayAbilities: [],
  gaps: "Autocuración limitada a una vez por partida: en el MVP es ilimitada.",
  resolveNight: ({ ability, actor, targetId, secondTargetId }): Effect[] => {
    switch (ability) {
      case "heal": return targetId ? [{ kind: "protect", actorId: actor.id, targetId, power: 2, source: "doctor" }] : [];
      default: return [];
    }
  },
};
