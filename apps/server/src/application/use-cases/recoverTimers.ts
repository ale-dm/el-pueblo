import { replay, type Catalog } from "@el-pueblo/engine";
import { initialState } from "../state/initialState.js";
import type { KeyedQueue } from "../concurrency/keyedQueue.js";
import type { CatalogSource, Clock, EventLog, MatchStore, PlayerStore, Scheduler } from "../ports.js";
import { modeOf, phaseDelayFor } from "../timing.js";
import { namingTimerKey } from "./beginNaming.js";
import { armTimer, type ArmedPhase } from "../events/timers.js";

export interface RecoverDeps {
  /** Cierra una elección de nombres que estaba abierta (ver finishNaming). */
  finishNaming?: (matchId: string) => Promise<void>;
  matches: MatchStore;
  players: PlayerStore;
  events: EventLog;
  catalog: CatalogSource;
  scheduler: Scheduler;
  clock: Clock;
  queue: KeyedQueue;
  /** Reprograma el turno de los bots de la fase actual, si la partida los tiene. */
  scheduleBots?: (matchId: string) => void;
}

export interface RecoverOptions {
  /** Rearmar también los turnos de los bots (al arrancar sí; el vigilante periódico no). */
  bots?: boolean;
}

/**
 * Vigilante de temporizadores. Al arrancar arma el temporizador de cada partida en curso y de cada elección de nombres
 * abierta. Después, periódicamente, rearma los que se hayan quedado sin temporizador (un fallo al guardar, un error del
 * motor ya registrado). No toca una partida que tiene temporizador o que está ocupada con un comando o un avance: la
 * comprobación y el armado se hacen sin esperas entre medias, así que no pisan un temporizador recién programado.
 */
export function recoverTimers(deps: RecoverDeps) {
  return async (advance: (matchId: string, armed?: ArmedPhase) => Promise<void>, options: RecoverOptions = {}): Promise<number> => {
    const catalog: Catalog = await deps.catalog.load();
    const now = deps.clock.now();
    let rearmed = 0;

    if (deps.finishNaming) {
      for (const match of await deps.matches.listByStatus("lobby")) {
        if (!match.namingEndsAt) continue;
        const key = namingTimerKey(match.id);
        if (deps.scheduler.has(key) || deps.queue.busy(match.id)) continue;
        const delay = Math.max(0, match.namingEndsAt.getTime() - now.getTime());
        armTimer(deps.scheduler, { key, matchId: match.id, label: "elección de nombres" }, delay, () => deps.finishNaming!(match.id));
        rearmed++;
      }
    }

    const playing = await deps.matches.listByStatus("playing");
    for (const match of playing) {
      const roster = await deps.players.listByMatch(match.id);
      const timed = await deps.events.readTimed(match.id);
      const state = replay(initialState(match, roster), timed.map((t) => t.event));
      const delay = phaseDelayFor(catalog, modeOf(match.config), state.phase, state.dayNumber, timed, now);
      if (delay !== null && !deps.scheduler.has(match.id) && !deps.queue.busy(match.id)) {
        const armed: ArmedPhase = { phase: state.phase, dayNumber: state.dayNumber };
        armTimer(deps.scheduler, { key: match.id, matchId: match.id, label: "fase" }, delay, () => advance(match.id, armed));
        rearmed++;
      }
      if (options.bots ?? true) deps.scheduleBots?.(match.id);
    }

    if (rearmed > 0) console.warn(`[server] vigilante: ${rearmed} temporizador(es) armados`);
    return playing.length;
  };
}
