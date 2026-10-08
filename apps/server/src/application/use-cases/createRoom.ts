import { AppError } from "../errors.js";
import { isValidNick } from "../limits.js";
import type { Clock, IdGenerator, MatchStore, PlayerStore, Security } from "../ports.js";

export interface CreateRoomDeps {
  matches: MatchStore;
  players: PlayerStore;
  clock: Clock;
  ids: IdGenerator;
  security: Security;
  engineVersion: string;
}

export interface CreateRoomInput {
  nick: string;
  config?: Record<string, unknown>;
}

export interface CreateRoomResult {
  matchId: string;
  roomCode: string;
  playerId: string;
  seat: number;
  /** Se devuelve una sola vez. Solo se guarda su hash. */
  token: string;
}

const MAX_CODE_ATTEMPTS = 5;

export function createRoom(deps: CreateRoomDeps) {
  return async (input: CreateRoomInput): Promise<CreateRoomResult> => {
    if (!isValidNick(input.nick)) throw new AppError("invalid_input", "Nick no válido");

    let roomCode: string | null = null;
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS && roomCode === null; attempt++) {
      const candidate = deps.ids.roomCode();
      if ((await deps.matches.findActiveByRoomCode(candidate)) === null) roomCode = candidate;
    }
    if (roomCode === null) throw new AppError("conflict", "No se pudo generar un código de sala libre");

    const matchId = deps.ids.uuid();
    const token = deps.security.newToken();
    const playerId = deps.ids.uuid();

    await deps.matches.insert({
      id: matchId,
      roomCode,
      status: "lobby",
      seed: deps.security.newSeed(),
      config: input.config ?? {},
      engineVersion: deps.engineVersion,
      createdAt: deps.clock.now(),
    });
    await deps.players.insert({
      id: playerId,
      matchId,
      seat: 1,
      nick: input.nick.trim(),
      roleKey: null,
      faction: null,
      status: "alive",
      connected: true,
      deathReason: null,
      usesLeft: {},
      flags: {},
      tokenHash: deps.security.hashToken(token),
    });

    return { matchId, roomCode, playerId, seat: 1, token };
  };
}
