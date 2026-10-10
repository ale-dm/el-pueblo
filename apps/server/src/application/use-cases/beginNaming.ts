import type { KeyedQueue } from "../concurrency/keyedQueue.js";
import { AppError } from "../errors.js";
import { LIMITS } from "../limits.js";
import type { Clock, MatchStore, PlayerStore, Scheduler, Security } from "../ports.js";

/** Clave del temporizador de la elección de nombres (distinta de la de la partida). */
export const namingTimerKey = (matchId: string) => `${matchId}:naming`;

export interface BeginNamingDeps {
  matches: MatchStore;
  players: PlayerStore;
  clock: Clock;
  security: Security;
  queue: KeyedQueue;
  scheduler: Scheduler;
  /** Cierra la elección: a quien no eligió le toca un nombre por defecto, y la partida empieza. */
  finish: (matchId: string) => Promise<void>;
}

export interface BeginNamingInput {
  matchId: string;
  /** Token del anfitrión (asiento 1). */
  token: string;
}

/**
 * El anfitrión abre la elección de nombres. Cada jugador tiene el tiempo de la sala para escribir el suyo (wiki: Name).
 * Los nombres de entrada se borran: el nombre de la partida se elige en esta fase. Los bots conservan el suyo.
 */
export function beginNaming(deps: BeginNamingDeps) {
  return (input: BeginNamingInput) =>
    deps.queue.run(input.matchId, async () => {
      const match = await deps.matches.findById(input.matchId);
      if (!match) throw new AppError("not_found", "Partida no encontrada");
      const host = await deps.players.findByTokenHash(match.id, deps.security.hashToken(input.token));
      if (!host) throw new AppError("forbidden", "Token no válido para esta partida");
      if (host.seat !== 1) throw new AppError("forbidden", "Solo el anfitrión puede empezar la partida");
      if (match.status !== "lobby") throw new AppError("invalid_state", "La partida ya ha empezado");
      if (match.namingEndsAt) throw new AppError("invalid_state", "Ya se están eligiendo los nombres");

      const roster = await deps.players.listByMatch(match.id);
      if (roster.length < LIMITS.minPlayersToStart) {
        throw new AppError("invalid_state", `Hacen falta al menos ${LIMITS.minPlayersToStart} jugadores para empezar`);
      }
      for (const player of roster) {
        if (!player.isBot) await deps.players.update({ ...player, nick: "" });
      }

      const endsAt = new Date(deps.clock.now().getTime() + LIMITS.namingSeconds * 1000);
      await deps.matches.update({ ...match, namingEndsAt: endsAt });
      deps.scheduler.schedule(namingTimerKey(match.id), LIMITS.namingSeconds * 1000, () => void deps.finish(match.id).catch(() => undefined));
      return { namingEndsAt: endsAt.toISOString() };
    });
}
