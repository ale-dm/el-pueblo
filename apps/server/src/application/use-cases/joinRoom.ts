import { AppError } from "../errors.js";
import { LIMITS, isValidNick } from "../limits.js";
import type { IdGenerator, MatchStore, PlayerStore, Security } from "../ports.js";

export interface JoinRoomDeps {
  matches: MatchStore;
  players: PlayerStore;
  ids: IdGenerator;
  security: Security;
}

export interface JoinRoomInput {
  roomCode: string;
  nick: string;
}

export interface JoinRoomResult {
  matchId: string;
  playerId: string;
  seat: number;
  token: string;
}

export function joinRoom(deps: JoinRoomDeps) {
  return async (input: JoinRoomInput): Promise<JoinRoomResult> => {
    if (!isValidNick(input.nick)) throw new AppError("invalid_input", "Nick no válido");

    const match = await deps.matches.findActiveByRoomCode(input.roomCode.toUpperCase());
    if (!match) throw new AppError("not_found", "No existe ninguna sala con ese código");
    if (match.status !== "lobby") throw new AppError("invalid_state", "La partida ya ha empezado");

    const current = await deps.players.listByMatch(match.id);
    if (current.length >= LIMITS.maxPlayers) throw new AppError("invalid_state", "La sala está llena");

    const nick = input.nick.trim();
    if (current.some((p) => p.nick.toLowerCase() === nick.toLowerCase())) {
      throw new AppError("invalid_input", "Ese nick ya está en la sala");
    }

    const taken = new Set(current.map((p) => p.seat));
    let seat = 1;
    while (taken.has(seat)) seat++;

    const token = deps.security.newToken();
    const playerId = deps.ids.uuid();
    await deps.players.insert({
      id: playerId,
      matchId: match.id,
      seat,
      nick,
      roleKey: null,
      faction: null,
      status: "alive",
      connected: true,
      deathReason: null,
      usesLeft: {},
      flags: {},
      tokenHash: deps.security.hashToken(token),
    });

    return { matchId: match.id, playerId, seat, token };
  };
}
