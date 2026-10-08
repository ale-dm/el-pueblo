import type { GameEventEnvelope } from "@el-pueblo/engine";
import type { KeyedQueue } from "../concurrency/keyedQueue.js";
import { factsFromEvents } from "../narration/facts.js";
import type { Broadcaster, Clock, MatchStore, NarrationStore, Narrator, PlayerStore, CatalogSource } from "../ports.js";

export interface NarrateDeps {
  matches: MatchStore;
  players: PlayerStore;
  narrations: NarrationStore;
  narrator: Narrator;
  broadcaster: Broadcaster;
  catalog: CatalogSource;
  clock: Clock;
  queue: KeyedQueue;
}

/**
 * Narra los hechos públicos de un lote de eventos. Corre en su propia cola (una por partida) para que
 * una llamada lenta a Gemini nunca retrase las fases ni los comandos de jugadores.
 */
export function narrate(deps: NarrateDeps) {
  return (matchId: string, events: readonly GameEventEnvelope[]): Promise<void> =>
    deps.queue.run(`narration:${matchId}`, async () => {
      const roster = await deps.players.listByMatch(matchId);
      const catalog = await deps.catalog.load();
      const nickOf = (id: string) => roster.find((p) => p.id === id)?.nick ?? "alguien";
      const roleOf = (key: string) => catalog.roles.get(key)?.name ?? null;
      const facts = factsFromEvents(events, nickOf, roleOf);
      if (facts.length === 0) return;

      const narration = await deps.narrator.narrate(facts);
      const seq = events.at(-1)?.seq ?? 0;
      await deps.narrations.insert({ matchId, eventSeq: seq, ...narration, createdAt: deps.clock.now() });
      await deps.broadcaster.publishNarration(matchId, { seq, text: narration.text, source: narration.source });
    });
}
