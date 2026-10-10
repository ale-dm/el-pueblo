/**
 * Personajes por defecto de Town of Salem (wiki: Avatars (ToS), "Default Skins"). Son el aspecto de cada jugador,
 * no un rol: todos los jugadores tienen uno. Las copias servidas están en public/avatars/.
 */
export const AVATARS = ["GilesCorey", "JohnProctor", "MaryWarren", "AbigailWilliams", "BettyParris"] as const;

/** Personaje de un jugador. Depende solo de su asiento: el mismo jugador lo ve igual tras recargar. */
export function avatarUrl(seat: number): string {
  const index = (((seat - 1) % AVATARS.length) + AVATARS.length) % AVATARS.length;
  return `/avatars/${AVATARS[index]}.webp`;
}
