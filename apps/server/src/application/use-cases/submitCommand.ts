import type { GameEventEnvelope } from "@el-pueblo/engine";
import { createRng, decide, replay, type Catalog, type Command } from "@el-pueblo/engine";
import { AppError, ConcurrencyError } from "../errors.js";
import type { KeyedQueue } from "../concurrency/keyedQueue.js";
import { initialState } from "../state/initialState.js";
import type { Broadcaster, CatalogSource, Clock, EventLog, MatchStore, PlayerStore, Scheduler, Security } from "../ports.js";
import { modeOf, phaseDelayFor } from "../timing.js";

export interface SubmitCommandDeps {
  matches: MatchStore;
  players: PlayerStore;
  events: EventLog;
  broadcaster: Broadcaster;
  catalog: CatalogSource;
  clock: Clock;
  security: Security;
  queue: KeyedQueue;
  scheduler: Scheduler;
  advance: (matchId: string) => Promise<void>;
  /** Narración asíncrona de los eventos publicados. No se espera. */
  afterEvents?: (matchId: string, events: GameEventEnvelope[]) => void;
}

/** Comandos que solo emite el servidor: un cliente no puede iniciar la partida ni forzar el paso de fase. */
const SERVER_ONLY = new Set<Command["type"]>(["game.start", "timer.expired"]);

/** Jugador que actúa con el comando, si el comando lo indica. */
function actorOf(command: Command): string | undefined {
  switch (command.type) {
    case "vote":
    case "judgement.vote":
      return command.voterId;
    case "night.action.cancel":
      return command.actorId;
    case "will.write":
      return command.playerId;
    case "day.action":
    case "night.action":
      return command.actorId;
    case "chat.send":
      return command.senderId;
    default:
      return undefined;
  }
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

      if (SERVER_ONLY.has(input.command.type)) throw new AppError("forbidden", "Comando reservado al servidor");
      const actor = actorOf(input.command);
      if (actor !== undefined && actor !== player.id) throw new AppError("forbidden", "No puedes actuar por otro jugador");

      if (match.status !== "playing") throw new AppError("invalid_state", "La partida no está en curso");

      const catalog = await loadCatalog();
      const timed = await deps.events.readTimed(match.id);
      const roster = await deps.players.listByMatch(match.id);
      const state = replay(initialState(match, roster), timed.map((t) => t.event));

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
      const ended = decision.value.some((e) => e.type === "game.ended");
      if (ended) {
        await deps.matches.update({ ...match, status: "finished", endedAt: deps.clock.now() });
        deps.scheduler.cancel(match.id);
      }
      await deps.broadcaster.publish(match.id, decision.value);
      deps.afterEvents?.(match.id, decision.value);
      const phaseStart = decision.value.filter((e) => e.type === "phase.started").at(-1);
      if (phaseStart?.type === "phase.started" && !ended) {
        const delay = phaseDelayFor(
          await loadCatalog(), modeOf(match.config), phaseStart.payload.phase, phaseStart.payload.dayNumber, timed,
        );
        if (delay !== null) deps.scheduler.schedule(match.id, delay, () => void deps.advance(match.id));
      }
      return { events: decision.value };
    });
}
