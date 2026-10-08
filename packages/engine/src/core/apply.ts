import type { GameEventEnvelope } from "../types/events.js";
import type { GameState } from "../types/state.js";

/**
 * Reducer: (estado, evento) → estado nuevo. Función pura y determinista.
 * Replay de una partida = aplicar sus eventos en orden sobre el estado inicial.
 * BORRADOR: los casos se añaden con cada evento del catálogo (src/types/events.ts).
 */
export function apply(state: GameState, event: GameEventEnvelope): GameState {
  return { ...state, seq: event.seq };
}
