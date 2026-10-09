import type { PublicPlayer } from "../types.js";

/**
 * Roles que el Retributionist no puede resucitar (wiki: docs/roles/Retributionist.md:236, "A Psychic, Trapper, Jailor,
 * Veteran, Mayor, Medium, Transporter, or another Retributionist (if you were an Amnesiac) cannot be resurrected.").
 * Espejo de NOT_RESURRECTABLE_KEYS del motor (packages/engine/src/roles/town/retributionist.ts). La excepción de
 * Amnesiac queda fuera del MVP.
 */
export const NOT_RESURRECTABLE_ROLES: readonly string[] = [
  "psychic", "trapper", "jailor", "veteran", "mayor", "medium", "transporter", "retributionist",
];

/**
 * Objetivo válido para "Alzar" (wiki: Retributionist.md:236): un muerto cuyo rol se conoce y no está en la lista.
 * El rol es el que muestra la muerte (`revealedRoleKey`); en un cadáver falsificado es el falso, que es lo que ve
 * el Retributionist. El motor vuelve a comprobar el rol real.
 */
export function canBeResurrected(p: Pick<PublicPlayer, "status" | "revealedRoleKey">): boolean {
  return p.status !== "alive" && p.revealedRoleKey !== null && !NOT_RESURRECTABLE_ROLES.includes(p.revealedRoleKey);
}
