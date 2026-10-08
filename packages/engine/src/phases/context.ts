import { apply } from "../core/apply.js";
import { emit } from "../events/emit.js";
import type { EventInput } from "../types/events.js";
import type { GameState, PlayerState } from "../types/state.js";
import { ROLE_HANDLERS } from "../roles/registry.js";
import type { RoleHandler } from "../roles/types.js";
import { checkVictory } from "../rules/victory.js";

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

/** Añade game.ended si la partida termina con estos eventos. */
export function withVictory(s: GameState, inputs: EventInput[]): EventInput[] {
  const winner = checkVictory(applyInputs(s, inputs).players);
  return winner ? [...inputs, { type: "game.ended", payload: { winner } }] : inputs;
}

export const phaseStarted = (phase: GameState["phase"], dayNumber: number): EventInput => ({
  type: "phase.started",
  payload: { phase, dayNumber },
});
