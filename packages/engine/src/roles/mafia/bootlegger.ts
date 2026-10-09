import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Bootlegger · Mafia · prioridad 2 · ficha: docs/roles/Bootlegger.md
export const handler: RoleHandler = {
  key: "bootlegger",
  name: "Bootlegger",
  faction: "mafia",
  priority: 2,
  nightAbilities: [{ key: "distract", target: "player", usesLimit: null }],
  dayAbilities: [],
  // Wiki (Bootlegger.md:202): "You cannot be Roleblocked."
  roleblockImmune: true,
  resolveNight: ({ ability, actor, targetId, secondTargetId }): Effect[] => {
    switch (ability) {
      case "distract": return targetId ? [{ kind: "block", actorId: actor.id, targetId }] : [];
      default: return [];
    }
  },
};
