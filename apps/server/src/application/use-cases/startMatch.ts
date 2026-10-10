import type { GameEventEnvelope } from "@el-pueblo/engine";
import { createRng, decide, type Catalog } from "@el-pueblo/engine";
import { AppError } from "../errors.js";
import type { KeyedQueue } from "../concurrency/keyedQueue.js";
import { pickDefaultName } from "../defaultNames.js";
import { initialState } from "../state/initialState.js";
import type { Broadcaster, CatalogSource, Clock, EventLog, MatchRecord, MatchStore, PlayerRecord, PlayerStore, Scheduler, Security } from "../ports.js";
import { modeOf, phaseDelayMs } from "../timing.js";
import { namingTimerKey } from "./beginNaming.js";

export interface StartMatchDeps {
  matches: MatchStore;
  players: PlayerStore;
  events: EventLog;
  broadcaster: Broadcaster;
  catalog: CatalogSource;
  clock: Clock;
  security: Security;
  queue: KeyedQueue;
  scheduler: Scheduler;
  /** Avance por tiempo (ver advanceOnTimeout). Se inyecta al componer. */
  advance: (matchId: string) => Promise<void>;
  /** Narración asíncrona de los eventos publicados. No se espera. */
  afterEvents?: (matchId: string, events: GameEventEnvelope[]) => void;
}

export interface StartMatchInput {
  matchId: string;
  /** Token del anfitrión (asiento 1). */
  token: string;
}

/**
 * Arranque de la partida, sin comprobar el token: completa con un nombre por defecto a quien no eligió (wiki: Name),
 * reparte roles y abre el primer día. Se llama dentro de la cola de la partida.
 */
export function startGame(deps: StartMatchDeps) {
  let cachedCatalog: Promise<Catalog> | null = null;
  return async (match: MatchRecord, hostId: string): Promise<number> => {
    const roster = await withDefaultNames(deps.players, await deps.players.listByMatch(match.id));
    const state = initialState(match, roster);
    cachedCatalog ??= deps.catalog.load();
    const decision = decide(
      state,
      { type: "game.start", hostId },
      { catalog: await cachedCatalog, rng: createRng(match.seed), now: deps.clock.now() },
    );
    if (!decision.ok) {
      const code = decision.error.code === "wrong_phase" ? "invalid_state" : "engine_rejected";
      throw new AppError(code, decision.error.message);
    }

    await deps.events.append(match.id, 0, decision.value);
    for (const event of decision.value) {
      if (event.type !== "roles.assigned") continue;
      const player = roster.find((p) => p.id === event.payload.playerId);
      if (player) {
        await deps.players.update({
          ...player,
          roleKey: event.payload.roleKey,
          faction: event.payload.faction,
          usesLeft: { ...event.payload.uses },
        });
      }
    }
    await deps.matches.update({ ...match, status: "playing", namingEndsAt: null });
    deps.scheduler.cancel(namingTimerKey(match.id));
    await deps.broadcaster.publish(match.id, decision.value);
    deps.afterEvents?.(match.id, decision.value);
    const delay = phaseDelayMs(await cachedCatalog, modeOf(match.config), "day_1");
    if (delay !== null) deps.scheduler.schedule(match.id, delay, () => void deps.advance(match.id));
    return decision.value.length;
  };
}

/** A quien no eligió nombre (jugadores sin nombre tras la elección) le toca uno por defecto. Los bots ya tienen el suyo. */
async function withDefaultNames(players: PlayerStore, roster: PlayerRecord[]): Promise<PlayerRecord[]> {
  const taken = new Set(roster.filter((p) => p.nick.trim() !== "").map((p) => p.nick.trim().toLowerCase()));
  const result: PlayerRecord[] = [];
  for (const player of roster) {
    if (player.isBot || player.nick.trim() !== "") {
      result.push(player);
      continue;
    }
    const nick = pickDefaultName(taken);
    taken.add(nick.toLowerCase());
    const named = { ...player, nick };
    await players.update(named);
    result.push(named);
  }
  return result;
}

/** Reparte roles y abre el primer día, a petición del anfitrión (incluso antes de que acabe la elección de nombres). */
export function startMatch(deps: StartMatchDeps) {
  const game = startGame(deps);
  return (input: StartMatchInput) =>
    deps.queue.run(input.matchId, async () => {
      const match = await deps.matches.findById(input.matchId);
      if (!match) throw new AppError("not_found", "Partida no encontrada");
      const host = await deps.players.findByTokenHash(match.id, deps.security.hashToken(input.token));
      if (!host) throw new AppError("forbidden", "Token no válido para esta partida");
      if (host.seat !== 1) throw new AppError("forbidden", "Solo el anfitrión puede empezar la partida");
      if (match.status !== "lobby") throw new AppError("invalid_state", "La partida ya ha empezado");
      return { events: await game(match, host.id) };
    });
}
