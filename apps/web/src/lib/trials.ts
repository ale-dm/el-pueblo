import type { GameEvent } from "../types.js";

/** Juicios que quedan hoy (máximo 3 por día). Se cuenta desde el último inicio de día del registro. */
export function trialsLeftToday(log: readonly GameEvent[]): number {
  let used = 0;
  for (const e of log) {
    if (e.type === "phase.started" && (e.payload.phase === "day_1" || e.payload.phase === "discussion")) used = 0;
    if (e.type === "trial.started") used++;
  }
  return Math.max(0, 3 - used);
}
