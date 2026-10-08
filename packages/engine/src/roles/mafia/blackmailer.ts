import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Blackmailer · Mafia · prioridad 3 · ficha: docs/roles/Blackmailer.md
export const handler: RoleHandler = {
  key: "blackmailer",
  name: "Blackmailer",
  faction: "mafia",
  priority: 3,
  nightAbilities: [{ key: "blackmail", target: "player", usesLimit: null }],
  dayAbilities: [],
  resolveNight: ({ ability, actor, targetId, secondTargetId }): Effect[] => {
    switch (ability) {
      case "blackmail": return targetId ? [{ kind: "mark", actorId: actor.id, targetId, flag: "blackmailed" }] : [];
      default: return [];
    }
  },
};
