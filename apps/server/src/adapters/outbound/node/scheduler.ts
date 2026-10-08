import type { Scheduler } from "../../../application/ports.js";

/** Temporizadores reales con setTimeout. Uno por partida; programar otro cancela el anterior. */
export class NodeScheduler implements Scheduler {
  private readonly timers = new Map<string, NodeJS.Timeout>();

  schedule(matchId: string, delayMs: number, onFire: () => void) {
    this.cancel(matchId);
    const timer = setTimeout(() => {
      this.timers.delete(matchId);
      onFire();
    }, delayMs);
    this.timers.set(matchId, timer);
  }

  cancel(matchId: string) {
    const timer = this.timers.get(matchId);
    if (timer) clearTimeout(timer);
    this.timers.delete(matchId);
  }
}
