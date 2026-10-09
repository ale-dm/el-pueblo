import type { Effect } from "../effects.js";
import type { RoleHandler } from "../types.js";

// Hypnotist · Mafia · prioridad 3 · ficha: docs/roles/Hypnotist.md
/** Mensajes que puede plantar (wiki: Hypnotist.md:232-258, "Hypnotist Message Options"). Solo los de roles MVP:
 * transporte, defensa de otro, trampa. Los de veneno y de Coven quedan fuera del MVP. */
export const HYPNOSIS_MESSAGES = [
  "attacked", "protected", "roleblocked", "transported", "fought_off", "trap_triggered", "trap_saved", "trap_healed",
] as const;
export type HypnosisMessage = (typeof HYPNOSIS_MESSAGES)[number];

export const handler: RoleHandler = {
  key: "hypnotist",
  name: "Hypnotist",
  faction: "mafia",
  priority: 3,
  // Planta un recuerdo falso en un jugador: al terminar la noche recibe un mensaje que no es verdad.
  nightAbilities: [{ key: "hypnotize", target: "player", usesLimit: null, choices: [...HYPNOSIS_MESSAGES] }],
  dayAbilities: [],
  gaps: "No se convierte en Mafioso cuando no quedan Mafiosos con capacidad de matar (simplificación).",
  resolveNight: ({ ability, actor, targetId, choice }): Effect[] => {
    if (ability !== "hypnotize" || !targetId || !HYPNOSIS_MESSAGES.some((m) => m === choice)) return [];
    return [{ kind: "hypnosis", actorId: actor.id, targetId, message: choice as HypnosisMessage }];
  },
};
