import { KeyedQueue } from "./application/concurrency/keyedQueue.js";
import { advanceOnTimeout } from "./application/use-cases/advanceOnTimeout.js";
import { createRoom, type CreateRoomDeps } from "./application/use-cases/createRoom.js";
import { joinRoom } from "./application/use-cases/joinRoom.js";
import { reconnect } from "./application/use-cases/reconnect.js";
import { setConnection } from "./application/use-cases/setConnection.js";
import { recoverTimers } from "./application/use-cases/recoverTimers.js";
import { startMatch } from "./application/use-cases/startMatch.js";
import { submitCommand, type SubmitCommandDeps } from "./application/use-cases/submitCommand.js";
import type { Scheduler } from "./application/ports.js";

/**
 * Dependencias de infraestructura: la unión de los puertos que usan los casos de uso.
 * El resto de la aplicación solo ve los puertos, nunca los adaptadores.
 */
export type Deps = Omit<SubmitCommandDeps, "queue" | "advance"> & CreateRoomDeps & { scheduler: Scheduler };

/** Ensambla los casos de uso. Es el único sitio que conoce a los adaptadores concretos. */
export function createServices(deps: Deps) {
  const queue = new KeyedQueue();
  const advance = advanceOnTimeout({ ...deps, queue });
  return {
    createRoom: createRoom(deps),
    joinRoom: joinRoom(deps),
    startMatch: startMatch({ ...deps, queue, advance }),
    submitCommand: submitCommand({ ...deps, queue, advance }),
    reconnect: reconnect(deps),
    setConnection: setConnection(deps),
    recoverTimers: recoverTimers(deps),
    advance,
  };
}

export type Services = ReturnType<typeof createServices>;
