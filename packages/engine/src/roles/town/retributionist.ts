import type { Effect } from "../effects.js";
import type { NightAbility, RoleHandler } from "../types.js";
import type { PlayerState } from "../../types/state.js";
import { ROLE_HANDLERS } from "../registry.js";
import { handlerOf } from "../../phases/context.js";

// Retributionist · Town · prioridad 1 · ficha: docs/roles/Retributionist.md
/** Habilidad que usa el zombi (Town muerto) sobre su segundo objetivo: una de objetivo único y sin usos limitados. */
export const zombieAbilityOf = (zombie: PlayerState | undefined): NightAbility | undefined => {
  const zombieHandler = zombie ? handlerOf(zombie) : undefined;
  return zombieHandler?.nightAbilities.find((a) => a.target === "player" && a.usesLimit === null);
};

/**
 * Wiki (Forger.md:232): el Retributionist no usa un cadáver falsificado con un rol que no sea Town visitante, aunque el
 * rol real sea un Town visitante. "Visitante" es el criterio de las visitas (pipeline de noche): una habilidad que
 * apunta a un jugador o a dos. Mayor, Medium, Psychic y Veteran (alerta) no visitan.
 */
export const shownRoleAllowsRaise = (shownKey: string): boolean => {
  const shown = ROLE_HANDLERS.get(shownKey);
  return shown !== undefined && shown.faction === "town" && shown.nightAbilities.some((a) => a.target !== "none");
};

export const handler: RoleHandler = {
  key: "retributionist",
  name: "Retributionist",
  faction: "town",
  priority: 1,
  roleblockImmune: true,
  // Resucita a un Town muerto (zombi) y usa su habilidad sobre un segundo objetivo.
  nightAbilities: [{ key: "raise", target: "two", usesLimit: null }],
  dayAbilities: [],
  gaps: "Solo se usa la primera habilidad de objetivo único del zombi; el zombi usa su efecto una vez.",
  resolveNight: (ctx): Effect[] => {
    const { ability, actor, targetId, secondTargetId, state } = ctx;
    if (ability !== "raise" || !targetId || !secondTargetId) return [];
    const zombie = state.players.find((p) => p.id === targetId);
    const zombieAbility = zombieAbilityOf(zombie);
    if (!zombie || !zombieAbility) return [];
    // El zombi actúa con su propio efecto, dirigido al segundo objetivo; después se marca como usado.
    const effects = handlerOf(zombie)!.resolveNight({ ...ctx, actor: zombie, ability: zombieAbility.key, targetId: secondTargetId, secondTargetId: null, choice: null });
    return [...effects, { kind: "mark", actorId: actor.id, targetId: zombie.id, flag: "zombied" }];
  },
};
