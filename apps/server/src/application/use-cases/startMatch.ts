import { createRng, decide, type Catalog } from "@el-pueblo/engine";
import { AppError } from "../errors.js";
import type { KeyedQueue } from "../concurrency/keyedQueue.js";
import { initialState } from "../state/initialState.js";
import type { Broadcaster, CatalogSource, Clock, EventLog, MatchStore, PlayerStore, Security } from "../ports.js";

export interface StartMatchDeps {
  matches: MatchStore;
  players: PlayerStore;
  events: EventLog;
  broadcaster: Broadcaster;
  catalog: CatalogSource;
  clock: Clock;
  security: Security;
  queue: KeyedQueue;
}

export interface StartMatchInput {
  matchId: string;
  /** Token del anfitrión (asiento 1). */
  token: string;
}

/** Reparte roles y abre el primer día. Persiste los roles en el jugador para la proyección por bando. */
export function startMatch(deps: StartMatchDeps) {
  let cachedCatalog: Promise<Catalog> | null = null;
  return (input: StartMatchInput) =>
    deps.queue.run(input.matchId, async () => {
      const match = await deps.matches.findById(input.matchId);
      if (!match) throw new AppError("not_found", "Partida no encontrada");
      const host = await deps.players.findByTokenHash(match.id, deps.security.hashToken(input.token));
      if (!host) throw new AppError("forbidden", "Token no válido para esta partida");
      if (host.seat !== 1) throw new AppError("forbidden", "Solo el anfitrión puede empezar la partida");
      if (match.status !== "lobby") throw new AppError("invalid_state", "La partida ya ha empezado");

      const roster = await deps.players.listByMatch(match.id);
      const state = initialState(match, roster);
      cachedCatalog ??= deps.catalog.load();
      const decision = decide(
        state,
        { type: "game.start", hostId: host.id },
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
      await deps.matches.update({ ...match, status: "playing" });
      await deps.broadcaster.publish(match.id, decision.value);
      return { events: decision.value.length };
    });
}

