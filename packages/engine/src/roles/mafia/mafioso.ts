import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Mafioso · Mafia · prioridad 5 · ficha: docs/roles/Mafioso.md
export const handler: RoleHandler = {
  key: "mafioso",
  name: "Mafioso",
  faction: "mafia",
  priority: 5,
  nightAbilities: [{ key: "kill", target: "player", usesLimit: null }],
  dayAbilities: [],
  resolveNight: ({ ability, actor, targetId, secondTargetId }): Effect[] => {
    switch (ability) {
      case "kill": return targetId ? [{ kind: "mafiaKill", actorId: actor.id, targetId, role: "mafioso" }] : [];
      default: return [];
    }
  },
};
