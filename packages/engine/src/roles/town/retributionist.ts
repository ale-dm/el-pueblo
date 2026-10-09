import type { Effect } from "../effects.js";
import type { NightAbility, RoleHandler } from "../types.js";
import type { PlayerState } from "../../types/state.js";
import { ROLE_HANDLERS } from "../registry.js";
import { handlerOf } from "../../phases/context.js";

// Retributionist · Town · prioridad 1 · ficha: docs/roles/Retributionist.md
/**
 * Habilidad de objetivo único del zombi (Town muerto), tenga o no usos. El zombi visita a su segundo objetivo aunque no
 * le quede ninguna bala: "Vigilante (without bullets)... You can use it to prove yourself as the Retributionist to a Lookout
 * or Tracker." (wiki: Retributionist.md:302-304).
 */
export const zombieVisitAbilityOf = (zombie: PlayerState | undefined): NightAbility | undefined =>
  zombie ? handlerOf(zombie)?.nightAbilities.find((a) => a.target === "player") : undefined;

/**
 * Habilidad que el zombi usa sobre su segundo objetivo: de objetivo único y con usos sin gastar. Los usos son los del zombi,
 * no los del Retributionist: el Vigilante zombi dispara con sus balas restantes, y sin ellas no hace nada (wiki:
 * Retributionist.md:294-308, "Will shoot the target" / "No effect.").
 */
export const zombieAbilityOf = (zombie: PlayerState | undefined): NightAbility | undefined =>
  zombie ? handlerOf(zombie)?.nightAbilities.find((a) => a.target === "player" && (a.usesLimit === null || (zombie.usesLeft[a.key] ?? 0) > 0)) : undefined;

/**
 * Wiki (Forger.md:232): el Retributionist no usa un cadáver falsificado con un rol que no sea Town visitante, aunque el
 * rol real sea un Town visitante. "Visitante" es el criterio de las visitas (pipeline de noche): una habilidad que
 * apunta a un jugador o a dos. Mayor, Medium, Psychic y Veteran (alerta) no visitan.
 */
export const shownRoleAllowsRaise = (shownKey: string): boolean => {
  const shown = ROLE_HANDLERS.get(shownKey);
  return shown !== undefined && shown.faction === "town" && shown.nightAbilities.some((a) => a.target !== "none");
};

/**
 * Wiki (Retributionist.md:236): "A Psychic, Trapper, Jailor, Veteran, Mayor, Medium, Transporter, or another Retributionist
 * (if you were an Amnesiac) cannot be resurrected." La excepción del otro Retributionist exige ser Amnesiac, que no es
 * del MVP (catálogo: mvp = false): en el MVP ningún Retributionist se resucita. Se mira el rol real del muerto.
 */
export const NOT_RESURRECTABLE_KEYS: readonly string[] = [
  "psychic", "trapper", "jailor", "veteran", "mayor", "medium", "transporter", "retributionist",
];

export const isResurrectableRole = (roleKey: string): boolean => !NOT_RESURRECTABLE_KEYS.includes(roleKey);

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
    if (!zombie || !zombieVisitAbilityOf(zombie)) return [];
    // El zombi actúa con su propio efecto, dirigido al segundo objetivo, si le quedan usos. Se usa una vez y se pudre
    // (wiki: Retributionist.md:155), tenga o no balas: se marca como usado en cualquier caso.
    const zombieAbility = zombieAbilityOf(zombie);
    const effects = zombieAbility
      ? handlerOf(zombie)!.resolveNight({ ...ctx, actor: zombie, ability: zombieAbility.key, targetId: secondTargetId, secondTargetId: null, choice: null })
      : [];
    return [...effects, { kind: "mark", actorId: actor.id, targetId: zombie.id, flag: "zombied" }];
  },
};
