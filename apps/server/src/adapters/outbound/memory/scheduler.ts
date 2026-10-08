import type { Scheduler } from "../../../application/ports.js";

/** Planificador manual: los tests disparan los temporizadores cuando quieren. */
export class ManualScheduler implements Scheduler {
  readonly pending = new Map<string, { delayMs: number; onFire: () => void }>();

  schedule(matchId: string, delayMs: number, onFire: () => void) {
    this.pending.set(matchId, { delayMs, onFire });
  }

  cancel(matchId: string) {
    this.pending.delete(matchId);
  }

  /** Dispara el temporizador pendiente de la partida, si lo hay. */
  fire(matchId: string): boolean {
    const timer = this.pending.get(matchId);
    if (!timer) return false;
    this.pending.delete(matchId);
    timer.onFire();
    return true;
  }
}
