import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Hypnotist · Mafia · prioridad 3 · ficha: docs/roles/Hypnotist.md
export const handler: RoleHandler = {
  key: "hypnotist",
  name: "Hypnotist",
  faction: "mafia",
  priority: 3,
  // Planta un recuerdo falso en un jugador: al terminar la noche recibe un mensaje que no es verdad.
  nightAbilities: [{ key: "hypnotize", target: "player", usesLimit: null, choices: ["attacked", "protected", "roleblocked"] }],
  dayAbilities: [],
  gaps: "No se convierte en Mafioso cuando no quedan Mafiosos con capacidad de matar (simplificación).",
  resolveNight: ({ ability, actor, targetId, choice }): Effect[] => {
    if (ability !== "hypnotize" || !targetId || (choice !== "attacked" && choice !== "protected" && choice !== "roleblocked")) return [];
    return [{ kind: "hypnosis", actorId: actor.id, targetId, message: choice }];
  },
};
