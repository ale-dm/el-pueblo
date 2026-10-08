import { createRng, decide, replay, type Catalog, type Command } from "@el-pueblo/engine";
import { AppError, ConcurrencyError } from "../errors.js";
import type { KeyedQueue } from "../concurrency/keyedQueue.js";
import { initialState } from "../state/initialState.js";
import type { Broadcaster, CatalogSource, Clock, EventLog, MatchStore, PlayerStore, Security } from "../ports.js";

export interface SubmitCommandDeps {
  matches: MatchStore;
  players: PlayerStore;
  events: EventLog;
  broadcaster: Broadcaster;
  catalog: CatalogSource;
  clock: Clock;
  security: Security;
  queue: KeyedQueue;
}

export interface SubmitCommandInput {
  matchId: string;
  token: string;
  command: Command;
}

/**
 * Procesa un comando de un jugador. Todo ocurre dentro de la cola de la partida.
 * Las reglas las decide el motor; aquí solo se autentica, se reconstruye, se guarda y se publica.
 */
export function submitCommand(deps: SubmitCommandDeps) {
  let cachedCatalog: Promise<Catalog> | null = null;
  const loadCatalog = () => (cachedCatalog ??= deps.catalog.load());

  return (input: SubmitCommandInput) =>
    deps.queue.run(input.matchId, async () => {
      const match = await deps.matches.findById(input.matchId);
      if (!match) throw new AppError("not_found", "Partida no encontrada");

      const player = await deps.players.findByTokenHash(match.id, deps.security.hashToken(input.token));
      if (!player) throw new AppError("forbidden", "Token no válido para esta partida");

      if (match.status !== "playing") throw new AppError("invalid_state", "La partida no está en curso");

      const catalog = await loadCatalog();
      const history = await deps.events.read(match.id);
      const roster = await deps.players.listByMatch(match.id);
      const state = replay(initialState(match, roster), history);

      // Determinista: misma semilla y misma posición en el registro, mismo resultado.
      const rng = createRng(match.seed + state.seq);
      const decision = decide(state, input.command, { catalog, rng, now: deps.clock.now() });
      if (!decision.ok) throw new AppError("engine_rejected", decision.error.message);

      try {
        await deps.events.append(match.id, state.seq, decision.value);
      } catch (error) {
        if (error instanceof ConcurrencyError) throw new AppError("conflict", error.message);
        throw error;
      }
      await deps.broadcaster.publish(match.id, decision.value);
      return { events: decision.value };
    });
}
