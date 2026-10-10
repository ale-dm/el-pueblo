/** Límites de sala. Los valores vienen de docs/GDD.md; los marcados como propuesta están pendientes de confirmar. */
import { DEFAULT_NAMES } from "./defaultNames.js";

export const LIMITS = {
  maxPlayers: 15,
  /** Propuesta (GDD §5.1, pendiente de confirmar). */
  minPlayersToStart: 10,
  roomCodeLength: 6,
  nickMaxLength: 24,
  /** Nombre elegido en la partida (wiki: Name): hasta 16 caracteres. */
  chosenNameMaxLength: 16,
  /** Segundos para elegir nombre antes de repartir roles. Propuesta, pendiente de ajustar con el uso. */
  namingSeconds: 30,
} as const;

export function isValidNick(nick: string): boolean {
  const trimmed = nick.trim();
  return trimmed.length >= 1 && trimmed.length <= LIMITS.nickMaxLength;
}

/**
 * Nombre elegido en la partida (wiki: Name): solo letras, con espacios entre palabras; sin números ni símbolos, sin
 * dos mayúsculas seguidas, sin repetir un nombre por defecto. Los insultos no se filtran todavía (sin lista propia).
 */
export function isValidChosenName(nick: string): boolean {
  const trimmed = nick.trim();
  if (trimmed.length < 1 || trimmed.length > LIMITS.chosenNameMaxLength) return false;
  if (!/^\p{L}+(?: \p{L}+)*$/u.test(trimmed)) return false;
  if (/\p{Lu}\p{Lu}/u.test(trimmed)) return false;
  return !DEFAULT_NAMES.some((name) => name.toLowerCase() === trimmed.toLowerCase());
}
