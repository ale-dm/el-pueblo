import type { GameEventEnvelope } from "@el-pueblo/engine";
import type { PlayerRecord, PlayerStore } from "../ports.js";

/**
 * Refleja en la tabla de jugadores las muertes de un lote de eventos. La causa sigue la misma regla que el motor
 * (`apply.ts`): un ahorcado muere por "hanged"; el resto, por la causa del `player.killed`. El registro de eventos
 * sigue siendo la fuente de verdad: esto solo mantiene la tabla al día para consultas y para la vista de la partida.
 */
export async function recordDeaths(
  players: PlayerStore,
  roster: readonly PlayerRecord[],
  events: readonly GameEventEnvelope[],
): Promise<void> {
  for (const event of events) {
    if (event.type !== "player.killed" && event.type !== "player.hanged") continue;
    const player = roster.find((p) => p.id === event.payload.playerId);
    if (!player) continue;
    const deathReason = event.type === "player.hanged" ? "hanged" : event.payload.cause;
    await players.update({ ...player, status: "dead", deathReason });
  }
}
