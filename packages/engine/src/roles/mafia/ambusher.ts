import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Ambusher · Mafia · prioridad 1 · ficha: docs/roles/Ambusher.md
export const handler: RoleHandler = {
  key: "ambusher",
  name: "Ambusher",
  faction: "mafia",
  priority: 1,
  nightAbilities: [{ key: "ambush", target: "player", usesLimit: null }],
  dayAbilities: [],
  resolveNight: ({ ability, actor, targetId, secondTargetId }): Effect[] => {
    switch (ability) {
      case "ambush": return targetId ? [{ kind: "attackVisitors", actorId: actor.id, houseId: targetId, power: 1, cause: "ambush" }] : [];
      default: return [];
    }
  },
};
