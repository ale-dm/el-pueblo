import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Tavern Keeper · Town · prioridad 2 · ficha: docs/roles/Tavern_Keeper.md
export const handler: RoleHandler = {
  key: "tavern_keeper",
  name: "Tavern Keeper",
  faction: "town",
  priority: 2,
  nightAbilities: [{ key: "distract", target: "player", usesLimit: null }],
  dayAbilities: [],
  roleblockImmune: true,
  resolveNight: ({ ability, actor, targetId, secondTargetId }): Effect[] => {
    switch (ability) {
      case "distract": return targetId ? [{ kind: "block", actorId: actor.id, targetId }] : [];
      default: return [];
    }
  },
};
