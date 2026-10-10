import type { KeyedQueue } from "../concurrency/keyedQueue.js";
import type { MatchStore, PlayerStore } from "../ports.js";
import type { startGame } from "./startMatch.js";

export interface FinishNamingDeps {
  matches: MatchStore;
  players: PlayerStore;
  queue: KeyedQueue;
  game: ReturnType<typeof startGame>;
}

/**
 * Cierra la elección de nombres cuando se acaba el tiempo (o al reiniciar, si ya pasó): empieza la partida con los
 * nombres por defecto de quien no eligió. Si la partida ya no está en la sala de espera, no hace nada.
 */
export function finishNaming(deps: FinishNamingDeps) {
  return (matchId: string) =>
    deps.queue.run(matchId, async () => {
      const match = await deps.matches.findById(matchId);
      if (!match || match.status !== "lobby" || !match.namingEndsAt) return;
      const host = (await deps.players.listByMatch(matchId)).find((p) => p.seat === 1);
      if (!host) return;
      await deps.game(match, host.id);
    });
}
