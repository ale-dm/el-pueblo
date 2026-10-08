/** Límites de sala. Los valores vienen de docs/GDD.md; los marcados como propuesta están pendientes de confirmar. */
export const LIMITS = {
  maxPlayers: 15,
  /** Propuesta (GDD §5.1, pendiente de confirmar). */
  minPlayersToStart: 10,
  roomCodeLength: 6,
  nickMaxLength: 24,
} as const;

export function isValidNick(nick: string): boolean {
  const trimmed = nick.trim();
  return trimmed.length >= 1 && trimmed.length <= LIMITS.nickMaxLength;
}
