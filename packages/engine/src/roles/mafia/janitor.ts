import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Janitor · Mafia · prioridad 3 · ficha: docs/roles/Janitor.md
export const handler: RoleHandler = {
  key: "janitor",
  name: "Janitor",
  faction: "mafia",
  priority: 3,
  nightAbilities: [{ key: "clean", target: "player", usesLimit: 3 }],
  dayAbilities: [],
  resolveNight: ({ ability, actor, targetId, secondTargetId }): Effect[] => {
    switch (ability) {
      case "clean": return targetId ? [{ kind: "mark", actorId: actor.id, targetId, flag: "cleaned" }] : [];
      default: return [];
    }
  },
};
