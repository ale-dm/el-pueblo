import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Bodyguard · Town · prioridad 3 · ficha: docs/roles/Bodyguard.md
export const handler: RoleHandler = {
  key: "bodyguard",
  name: "Bodyguard",
  faction: "town",
  priority: 3,
  nightAbilities: [
    { key: "protect", target: "player", usesLimit: null },
    // Chaleco antibalas: se usa sobre uno mismo, una vez por partida (wiki: Bodyguard.md:119-121, 240-242).
    { key: "vest", target: "none", usesLimit: 1 },
  ],
  dayAbilities: [],
  resolveNight: ({ ability, actor, targetId, secondTargetId }): Effect[] => {
    switch (ability) {
      case "protect": return targetId ? [{ kind: "protect", actorId: actor.id, targetId, power: 2, source: "bodyguard" }] : [];
      // Basic Defense temporal, sin contraataque (wiki: Bodyguard.md:244).
      case "vest": return [{ kind: "protect", actorId: actor.id, targetId: actor.id, power: 1, source: "vest" }];
      default: return [];
    }
  },
};
