import type { GameState, PlayerState } from "@el-pueblo/engine";
import type { MatchRecord, PlayerRecord } from "../ports.js";

/**
 * Estado del motor antes de cualquier evento. Los eventos posteriores lo completan con `replay`.
 * Todos empiezan vivos: la tabla de jugadores se actualiza al morir (`recordDeaths`), así que su estado
 * ya no es el inicial y no debe usarse para reconstruir la partida.
 */
export function initialState(match: MatchRecord, players: readonly PlayerRecord[]): GameState {
  const playerStates: PlayerState[] = players.map(
    ({ id, seat, nick, roleKey, faction, connected, usesLeft, flags }) => ({
      id, seat, nick, roleKey, faction, status: "alive", connected, deathReason: null, usesLeft, flags,
    }),
  );
  return {
    matchId: match.id,
    engineVersion: match.engineVersion,
    phase: "day_1",
    dayNumber: 1,
    seq: 0,
    winner: null,
    players: playerStates,
    trialsToday: 0,
    votes: {},
    verdicts: {},
    defendantId: null,
    nightActions: {},
    traps: {},
    dayActionDay: {},
    wills: {}, jailedBy: {}, forgeries: {},
  };
}
