import type { RoleHandler } from "../roles/types.js";

/**
 * ¿Puede un bloqueo (Tavern Keeper, Bootlegger) apuntar a este rol?
 * Wiki: "You cannot Roleblock roles with Day abilties, because you have a Night ability." (docs/roles/Tavern_Keeper.md:181).
 * Por eso solo quedan fuera los roles cuya única habilidad vivo es de día (Mayor). El Jailor tiene habilidad de noche
 * y sí se bloquea (docs/roles/Jailor.md:286). El Psychic es pasivo: el bloqueo le quita la visión (Psychic.md:188).
 * El Medium vivo solo tiene habilidad de día de muerto (deadOnly), así que sí se puede bloquear.
 */
export function canBeRoleblocked(handler: RoleHandler | undefined): boolean {
  if (!handler) return false;
  if (handler.nightAbilities.length > 0 || handler.passive === true) return true;
  return handler.dayAbilities.every((a) => a.deadOnly === true);
}
