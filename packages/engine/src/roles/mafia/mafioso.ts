import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Mafioso · Mafia · prioridad 5 · ficha: docs/roles/Mafioso.md
export const handler: RoleHandler = {
  key: "mafioso",
  name: "Mafioso",
  faction: "mafia",
  priority: 5,
  // Nota de muerte: wiki Mafioso.md:237 ("Be able to leave a Death Note behind for the Town to see in the morning.").
  nightAbilities: [{ key: "kill", target: "player", usesLimit: null, deathNote: true }],
  dayAbilities: [],
  resolveNight: ({ ability, actor, targetId, secondTargetId }): Effect[] => {
    switch (ability) {
      case "kill": return targetId ? [{ kind: "mafiaKill", actorId: actor.id, targetId, role: "mafioso" }] : [];
      default: return [];
    }
  },
};
