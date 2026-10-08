import { KeyedQueue } from "./application/concurrency/keyedQueue.js";
import { advanceOnTimeout } from "./application/use-cases/advanceOnTimeout.js";
import { createRoom, type CreateRoomDeps } from "./application/use-cases/createRoom.js";
import { joinRoom } from "./application/use-cases/joinRoom.js";
import { reconnect } from "./application/use-cases/reconnect.js";
import { setConnection } from "./application/use-cases/setConnection.js";
import { recoverTimers } from "./application/use-cases/recoverTimers.js";
import { getView } from "./application/use-cases/getView.js";
import { narrate } from "./application/use-cases/narrate.js";
import { startMatch } from "./application/use-cases/startMatch.js";
import { submitCommand, type SubmitCommandDeps } from "./application/use-cases/submitCommand.js";
import type { NarrationStore, Narrator, Scheduler } from "./application/ports.js";
import type { GameEventEnvelope } from "@el-pueblo/engine";

/**
 * Dependencias de infraestructura: la unión de los puertos que usan los casos de uso.
 * El resto de la aplicación solo ve los puertos, nunca los adaptadores.
 */
export type Deps = Omit<SubmitCommandDeps, "queue" | "advance" | "afterEvents"> & CreateRoomDeps & {
  scheduler: Scheduler;
  narrations: NarrationStore;
  narrator: Narrator;
};

/** Ensambla los casos de uso. Es el único sitio que conoce a los adaptadores concretos. */
export function createServices(deps: Deps) {
  const queue = new KeyedQueue();
  const narrateEvents = narrate({ ...deps, queue });
  const afterEvents = (matchId: string, events: GameEventEnvelope[]) => {
    const pending = narrateEvents(matchId, events).catch(() => undefined);
    pendingNarrations.add(pending);
    void pending.finally(() => pendingNarrations.delete(pending));
  };
  const pendingNarrations = new Set<Promise<void>>();
  const advance = advanceOnTimeout({ ...deps, queue, afterEvents });
  return {
    createRoom: createRoom(deps),
    joinRoom: joinRoom(deps),
    startMatch: startMatch({ ...deps, queue, advance, afterEvents }),
    submitCommand: submitCommand({ ...deps, queue, advance, afterEvents }),
    /** Espera a que terminen las narraciones pendientes (para tests y para apagar el servidor). */
    drainNarrations: async () => {
      while (pendingNarrations.size > 0) await Promise.all([...pendingNarrations]);
    },
    reconnect: reconnect(deps),
    getView: getView(deps),
    setConnection: setConnection(deps),
    recoverTimers: recoverTimers(deps),
    advance,
  };
}

export type Services = ReturnType<typeof createServices>;
