import type { GameState, PlayerState } from "@el-pueblo/engine";
import type { MatchRecord, PlayerRecord } from "../ports.js";

/** Estado del motor antes de cualquier evento. Los eventos posteriores lo completan con `replay`. */
export function initialState(match: MatchRecord, players: readonly PlayerRecord[]): GameState {
  const playerStates: PlayerState[] = players.map(
    ({ id, seat, nick, roleKey, faction, status, connected, deathReason }) => ({
      id, seat, nick, roleKey, faction, status, connected, deathReason,
    }),
  );
  return {
    matchId: match.id,
    engineVersion: match.engineVersion,
    phase: "day_1",
    dayNumber: 1,
    trialsToday: 0,
    players: playerStates,
    seq: 0,
    winner: null,
  };
}
