import { replay, type Catalog } from "@el-pueblo/engine";
import { initialState } from "../state/initialState.js";
import type { CatalogSource, EventLog, MatchStore, PlayerStore, Scheduler } from "../ports.js";
import { modeOf, phaseDelayMs } from "../timing.js";

export interface RecoverDeps {
  matches: MatchStore;
  players: PlayerStore;
  events: EventLog;
  catalog: CatalogSource;
  scheduler: Scheduler;
}

/**
 * Al arrancar, reprograma el temporizador de cada partida en curso según su fase actual.
 * Así una partida no se queda parada por un reinicio del servidor.
 */
export function recoverTimers(deps: RecoverDeps) {
  return async (advance: (matchId: string) => Promise<void>): Promise<number> => {
    const catalog: Catalog = await deps.catalog.load();
    const playing = await deps.matches.listByStatus("playing");
    for (const match of playing) {
      const roster = await deps.players.listByMatch(match.id);
      const history = await deps.events.read(match.id);
      const state = replay(initialState(match, roster), history);
      const delay = phaseDelayMs(catalog, modeOf(match.config), state.phase);
      if (delay !== null) deps.scheduler.schedule(match.id, delay, () => void advance(match.id));
    }
    return playing.length;
  };
}
