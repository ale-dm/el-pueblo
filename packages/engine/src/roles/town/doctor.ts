import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Doctor · Town · prioridad 3 · ficha: docs/roles/Doctor.md
export const handler: RoleHandler = {
  key: "doctor",
  name: "Doctor",
  faction: "town",
  priority: 3,
  // La autocuración es una habilidad aparte: una vez por partida (wiki: Doctor, "You may only Heal yourself once").
  nightAbilities: [
    { key: "heal", target: "player", usesLimit: null },
    { key: "selfHeal", target: "none", usesLimit: 1 },
  ],
  dayAbilities: [],
  resolveNight: ({ ability, actor, targetId, secondTargetId }): Effect[] => {
    switch (ability) {
      case "heal": return targetId ? [{ kind: "protect", actorId: actor.id, targetId, power: 2, source: "doctor" }] : [];
      // Wiki (Transporter.md:234): si el Transporter lo lleva a otra casa, la autocuración se queda en el Doctor.
      case "selfHeal": return [{ kind: "protect", actorId: actor.id, targetId: actor.id, power: 2, source: "doctor", self: true }];
      default: return [];
    }
  },
};
