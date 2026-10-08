/** Tamaño de partida. Propuesta de docs/GDD.md §5.1, pendiente de confirmar el mínimo. */
export const GAME_LIMITS = { minPlayers: 10, maxPlayers: 15 } as const;

/** Mafia por número de jugadores: 3 hasta 14, 4 con 15 (GDD §5.1, propuesta). */
export function mafiaCountFor(playerCount: number): number {
  return playerCount >= 15 ? 4 : 3;
}
