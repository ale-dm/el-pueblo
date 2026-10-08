import type { GameEventEnvelope } from "../types/events.js";
import type { GameState } from "../types/state.js";
import { apply } from "./apply.js";

/** Reconstruye el estado aplicando los eventos en orden desde un estado inicial o un snapshot. */
export function replay(initial: GameState, events: readonly GameEventEnvelope[]): GameState {
  let state = initial;
  for (const event of events) {
    if (event.seq <= state.seq) continue; // ya incluido en el snapshot
    state = apply(state, event);
  }
  return state;
}
