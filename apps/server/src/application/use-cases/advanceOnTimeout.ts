import type { GameEventEnvelope } from "@el-pueblo/engine";
import { createRng, decide, replay, type Catalog } from "@el-pueblo/engine";
import type { KeyedQueue } from "../concurrency/keyedQueue.js";
import { initialState } from "../state/initialState.js";
import { recordDeaths } from "../state/recordDeaths.js";
import type { Broadcaster, CatalogSource, Clock, EventLog, MatchStore, PlayerStore, Scheduler } from "../ports.js";
import { modeOf, phaseDelayFor } from "../timing.js";

export interface AdvanceDeps {
  matches: MatchStore;
  players: PlayerStore;
  events: EventLog;
  broadcaster: Broadcaster;
  catalog: CatalogSource;
  clock: Clock;
  queue: KeyedQueue;
  scheduler: Scheduler;
  /** Narración asíncrona de los eventos publicados. No se espera. */
  afterEvents?: (matchId: string, events: GameEventEnvelope[]) => void;
}

/**
 * Cuando vence el temporizador de una fase, el motor avanza. Lo hace dentro de la cola de la partida,
 * así que no compite con un comando de jugador. Programa el temporizador de la fase siguiente.
 */
export function advanceOnTimeout(deps: AdvanceDeps) {
  let cachedCatalog: Promise<Catalog> | null = null;
  const loadCatalog = () => (cachedCatalog ??= deps.catalog.load());

  const advance = (matchId: string): Promise<void> =>
    deps.queue.run(matchId, async () => {
      const match = await deps.matches.findById(matchId);
      if (!match || match.status !== "playing") return;

      const roster = await deps.players.listByMatch(matchId);
      const timed = await deps.events.readTimed(matchId);
      const catalog = await loadCatalog();
      const state = replay(initialState(match, roster), timed.map((t) => t.event));

      const decision = decide(state, { type: "timer.expired" }, {
        catalog,
        rng: createRng(match.seed + state.seq),
        now: deps.clock.now(),
      });
      if (!decision.ok) return;

      await deps.events.append(matchId, state.seq, decision.value);
      await recordDeaths(deps.players, roster, decision.value);
      const ended = decision.value.some((e) => e.type === "game.ended");
      if (ended) {
        await deps.matches.update({ ...match, status: "finished", endedAt: deps.clock.now() });
        deps.scheduler.cancel(matchId);
      }
      await deps.broadcaster.publish(matchId, decision.value);
      deps.afterEvents?.(matchId, decision.value);

      const next = decision.value.filter((e) => e.type === "phase.started").at(-1);
      if (next?.type === "phase.started" && !ended) {
        const delay = phaseDelayFor(catalog, modeOf(match.config), next.payload.phase, next.payload.dayNumber, timed);
        if (delay !== null) deps.scheduler.schedule(matchId, delay, () => void advance(matchId));
      }
    });

  return advance;
}
