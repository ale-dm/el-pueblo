import { KeyedQueue } from "./application/concurrency/keyedQueue.js";
import { createRoom, type CreateRoomDeps } from "./application/use-cases/createRoom.js";
import { joinRoom } from "./application/use-cases/joinRoom.js";
import { reconnect } from "./application/use-cases/reconnect.js";
import { submitCommand, type SubmitCommandDeps } from "./application/use-cases/submitCommand.js";

/**
 * Dependencias de infraestructura: la unión de los puertos que usan los casos de uso.
 * El resto de la aplicación solo ve los puertos, nunca los adaptadores.
 */
export type Deps = Omit<SubmitCommandDeps, "queue"> & CreateRoomDeps;

/** Ensambla los casos de uso. Es el único sitio que conoce a los adaptadores concretos. */
export function createServices(deps: Deps) {
  const queue = new KeyedQueue();
  return {
    createRoom: createRoom(deps),
    joinRoom: joinRoom(deps),
    submitCommand: submitCommand({ ...deps, queue }),
    reconnect: reconnect(deps),
  };
}

export type Services = ReturnType<typeof createServices>;
