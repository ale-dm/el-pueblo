import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Spy · Town · prioridad 6 · ficha: docs/roles/Spy.md
export const handler: RoleHandler = {
  key: "spy",
  name: "Spy",
  faction: "town",
  priority: 6,
  // Wiki (Spy.md:193): "Bugging a player counts as you visiting them." El espionaje va al objetivo, no a una casa.
  nightAbilities: [{ key: "bug", target: "player", usesLimit: null }],
  dayAbilities: [],
  resolveNight: ({ ability, actor, targetId }): Effect[] => {
    // Wiki (Spy.md:189-205): espía el objetivo (un Transporter puede cambiarlo) y ve las visitas de la Mafia.
    if (ability !== "bug") return [];
    return [
      { kind: "investigate", actorId: actor.id, targetId, check: "bug" },
      { kind: "investigate", actorId: actor.id, targetId: null, check: "mafiaVisits" },
    ];
  },
};
