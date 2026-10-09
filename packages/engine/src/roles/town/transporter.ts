import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Transporter · Town · prioridad 1 · ficha: docs/roles/Transporter.md
export const handler: RoleHandler = {
  key: "transporter",
  name: "Transporter",
  faction: "town",
  priority: 1,
  nightAbilities: [{ key: "transport", target: "two", usesLimit: null }],
  dayAbilities: [],
  // Wiki (Transporter.md:194): no puede ser bloqueado por Tavern Keeper, Bootlegger o Pirate.
  roleblockImmune: true,
  resolveNight: ({ ability, actor, targetId, secondTargetId }): Effect[] => {
    switch (ability) {
      case "transport": return targetId && secondTargetId ? [{ kind: "transport", actorId: actor.id, firstId: targetId, secondId: secondTargetId }] : [];
      default: return [];
    }
  },
};
