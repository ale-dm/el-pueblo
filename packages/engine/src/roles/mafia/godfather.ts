import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Godfather · Mafia · prioridad 5 · ficha: docs/roles/Godfather.md
export const handler: RoleHandler = {
  key: "godfather",
  name: "Godfather",
  faction: "mafia",
  priority: 5,
  nightAbilities: [{ key: "kill", target: "player", usesLimit: null }],
  dayAbilities: [],
  resolveNight: ({ ability, actor, targetId, secondTargetId }): Effect[] => {
    switch (ability) {
      case "kill": return targetId ? [{ kind: "mafiaKill", actorId: actor.id, targetId, role: "godfather" }] : [];
      default: return [];
    }
  },
};
