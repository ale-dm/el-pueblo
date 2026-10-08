import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Framer · Mafia · prioridad 3 · ficha: docs/roles/Framer.md
export const handler: RoleHandler = {
  key: "framer",
  name: "Framer",
  faction: "mafia",
  priority: 3,
  nightAbilities: [{ key: "frame", target: "player", usesLimit: null }],
  dayAbilities: [],
  resolveNight: ({ ability, actor, targetId, secondTargetId }): Effect[] => {
    switch (ability) {
      case "frame": return targetId ? [{ kind: "mark", actorId: actor.id, targetId, flag: "framed" }] : [];
      default: return [];
    }
  },
};
