import type { KeyedQueue } from "../concurrency/keyedQueue.js";
import { AppError } from "../errors.js";
import { isValidChosenName } from "../limits.js";
import type { Clock, MatchStore, PlayerStore, Security } from "../ports.js";

export interface ChooseNameDeps {
  matches: MatchStore;
  players: PlayerStore;
  clock: Clock;
  security: Security;
  queue: KeyedQueue;
}

export interface ChooseNameInput {
  matchId: string;
  /** Token del jugador que elige. */
  token: string;
  nick: string;
}

/** El jugador escribe su nombre para la partida, mientras dura la elección de nombres. */
export function chooseName(deps: ChooseNameDeps) {
  return (input: ChooseNameInput) =>
    deps.queue.run(input.matchId, async () => {
      const match = await deps.matches.findById(input.matchId);
      if (!match) throw new AppError("not_found", "Partida no encontrada");
      const player = await deps.players.findByTokenHash(match.id, deps.security.hashToken(input.token));
      if (!player) throw new AppError("forbidden", "Token no válido para esta partida");
      const open = match.status === "lobby" && match.namingEndsAt && deps.clock.now() < match.namingEndsAt;
      if (!open) throw new AppError("invalid_state", "No es momento de elegir el nombre");

      const nick = input.nick.trim();
      if (!isValidChosenName(nick)) {
        throw new AppError("invalid_input", "Nombre no válido: hasta 16 letras, sin números ni símbolos, sin dos mayúsculas seguidas y sin nombres por defecto");
      }
      const roster = await deps.players.listByMatch(match.id);
      if (roster.some((p) => p.id !== player.id && p.nick.toLowerCase() === nick.toLowerCase())) {
        throw new AppError("invalid_input", "Ese nombre ya lo usa alguien en la sala");
      }
      await deps.players.update({ ...player, nick });
      return { nick };
    });
}
