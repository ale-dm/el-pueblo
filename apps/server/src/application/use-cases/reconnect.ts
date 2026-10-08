import { projectFor, type GameEventEnvelope } from "@el-pueblo/engine";
import { AppError } from "../errors.js";
import type { EventLog, PlayerStore, Security } from "../ports.js";

export interface ReconnectDeps {
  players: PlayerStore;
  events: EventLog;
  security: Security;
}

export interface ReconnectInput {
  matchId: string;
  token: string;
}

export interface ReconnectResult {
  playerId: string;
  seat: number;
  nick: string;
  /** Solo los eventos que este jugador puede ver. */
  events: GameEventEnvelope[];
}

export function reconnect(deps: ReconnectDeps) {
  return async (input: ReconnectInput): Promise<ReconnectResult> => {
    const player = await deps.players.findByTokenHash(input.matchId, deps.security.hashToken(input.token));
    if (!player) throw new AppError("forbidden", "Token no válido para esta partida");

    await deps.players.update({ ...player, connected: true });
    const history = await deps.events.read(input.matchId);
    return {
      playerId: player.id,
      seat: player.seat,
      nick: player.nick,
      events: projectFor(history, player),
    };
  };
}
