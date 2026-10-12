import { apply } from "../core/apply.js";
import { emit } from "../events/emit.js";
import type { EventInput } from "../types/events.js";
import type { FactionKey } from "../types/factions.js";
import type { GameState, PlayerState } from "../types/state.js";
import { ROLE_HANDLERS } from "../roles/registry.js";
import type { RoleHandler } from "../roles/types.js";
import { checkVictory, TIMEOUT_FIRST_DAY } from "../rules/victory.js";
import { checkStalemate } from "../rules/stalemate.js";

export const handlerOf = (p: PlayerState): RoleHandler | undefined =>
  p.roleKey ? ROLE_HANDLERS.get(p.roleKey) : undefined;

export const playerOf = (s: GameState, id: string): PlayerState | undefined => s.players.find((p) => p.id === id);

export const isAlive = (p: PlayerState | undefined): p is PlayerState => p?.status === "alive";

/** Jugadores que cuentan para votar: vivos y conectados (los desconectados cuentan como muertos en votación). */
export const votingPlayers = (s: GameState): PlayerState[] =>
  s.players.filter((p) => p.status === "alive" && p.connected);

/** Aplica eventos sin persistirlos, para mirar el estado resultante. */
export function applyInputs(s: GameState, inputs: readonly EventInput[]): GameState {
  return emit(s.seq, inputs).reduce(apply, s);
}

/**
 * Cómo acaba la partida con el estado resultante. Null si sigue; si acaba, winner null es empate.
 * - Aniquilación: no queda nadie vivo. Wiki (Victory_ToS.md:157): "factional roles will get a draw".
 * - Victoria de facción o empate automático entre dos vivos (checkStalemate).
 * - Empate por tiempo: al amanecer, desde el día 9, si no ha muerto nadie en las dos últimas noches
 *   (wiki: Victory_ToS.md:13, "no deaths in two consecutive Days"; leemos "días" como noches de muerte).
 */
export function endOf(s: GameState, morning: boolean): { winner: FactionKey | null } | null {
  if (s.players.every((p) => p.status !== "alive")) return { winner: null };
  const winner = checkVictory(s.players) ?? checkStalemate(s);
  if (winner) return { winner };
  const nextDay = s.dayNumber + 1;
  if (morning && nextDay >= TIMEOUT_FIRST_DAY && s.lastDeathDay <= s.dayNumber - 2) return { winner: null };
  return null;
}

/** Añade game.ended si la partida termina con estos eventos. Wiki (Victory_ToS.md:9-11): tras las muertes anunciadas y tras un ahorcamiento. */
export function withVictory(s: GameState, inputs: EventInput[], morning = false): EventInput[] {
  const end = endOf(applyInputs(s, inputs), morning);
  return end ? [...inputs, { type: "game.ended", payload: { winner: end.winner } }] : inputs;
}

export const phaseStarted = (phase: GameState["phase"], dayNumber: number): EventInput => ({
  type: "phase.started",
  payload: { phase, dayNumber },
});
