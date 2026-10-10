import { replay, type Catalog } from "@el-pueblo/engine";
import { initialState } from "../state/initialState.js";
import type { CatalogSource, Clock, EventLog, MatchStore, PlayerStore, Scheduler } from "../ports.js";
import { modeOf, phaseDelayFor } from "../timing.js";
import { namingTimerKey } from "./beginNaming.js";

export interface RecoverDeps {
  /** Cierra una elección de nombres que estaba abierta al reiniciar (ver finishNaming). */
  finishNaming?: (matchId: string) => Promise<void>;
  matches: MatchStore;
  players: PlayerStore;
  events: EventLog;
  catalog: CatalogSource;
  scheduler: Scheduler;
  clock: Clock;
  /** Reprograma el turno de los bots de la fase actual, si la partida los tiene. */
  scheduleBots?: (matchId: string) => void;
}

/**
 * Al arrancar, reprograma el temporizador de cada partida en curso según su fase actual.
 * Así una partida no se queda parada por un reinicio del servidor. Una votación recuperada
 * cuenta el tiempo que ya llevaba gastado.
 */
export function recoverTimers(deps: RecoverDeps) {
  return async (advance: (matchId: string) => Promise<void>): Promise<number> => {
    const catalog: Catalog = await deps.catalog.load();
    const now = deps.clock.now();
    for (const match of await deps.matches.listByStatus("lobby")) {
      if (!match.namingEndsAt || !deps.finishNaming) continue;
      const delay = Math.max(0, match.namingEndsAt.getTime() - now.getTime());
      deps.scheduler.schedule(namingTimerKey(match.id), delay, () => void deps.finishNaming!(match.id).catch(() => undefined));
    }
    const playing = await deps.matches.listByStatus("playing");
    for (const match of playing) {
      const roster = await deps.players.listByMatch(match.id);
      const timed = await deps.events.readTimed(match.id);
      const state = replay(initialState(match, roster), timed.map((t) => t.event));
      const delay = phaseDelayFor(catalog, modeOf(match.config), state.phase, state.dayNumber, timed, now);
      if (delay !== null) deps.scheduler.schedule(match.id, delay, () => void advance(match.id));
      deps.scheduleBots?.(match.id);
    }
    return playing.length;
  };
}
