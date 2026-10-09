import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Trapper · Town · prioridad 1 · ficha: docs/roles/Trapper.md
export const handler: RoleHandler = {
  key: "trapper",
  name: "Trapper",
  faction: "town",
  priority: 1,
  // Wiki (Trapper.md:46): "Traps can be torn down by selecting yourself at night."
  nightAbilities: [{ key: "trap", target: "player", usesLimit: null, selfAllowed: true }],
  dayAbilities: [],
  // Pasivo: cada noche construye la trampa si no tiene ninguna (wiki: Trapper.md:213). Así también puede
  // bloquearse y estar encarcelado la noche de construcción (wiki: Trapper.md:215), aunque no elija nada.
  passive: true,
  resolveNight: ({ ability, actor, targetId, secondTargetId }): Effect[] => {
    switch (ability) {
      case "passive": return [{ kind: "build", actorId: actor.id }];
      // Wiki (Trapper.md:229): elegirse a sí mismo desmonta la trampa; al final de la noche se reconstruye al instante.
      case "trap":
        if (!targetId) return [];
        return targetId === actor.id
          ? [{ kind: "trap", actorId: actor.id, targetId }, { kind: "build", actorId: actor.id }]
          : [{ kind: "trap", actorId: actor.id, targetId }];
      default: return [];
    }
  },
};
