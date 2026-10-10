import { KeyedQueue } from "./application/concurrency/keyedQueue.js";
import { advanceOnTimeout } from "./application/use-cases/advanceOnTimeout.js";
import { botTurn } from "./application/use-cases/botTurn.js";
import { createRoom, type CreateRoomDeps } from "./application/use-cases/createRoom.js";
import { joinRoom } from "./application/use-cases/joinRoom.js";
import { reconnect } from "./application/use-cases/reconnect.js";
import { setConnection } from "./application/use-cases/setConnection.js";
import { recoverTimers } from "./application/use-cases/recoverTimers.js";
import { getView } from "./application/use-cases/getView.js";
import { narrate } from "./application/use-cases/narrate.js";
import { notifyPhases, subscribePush } from "./application/use-cases/push.js";
import { purgeExpired, type RetentionPolicy } from "./application/use-cases/retention.js";
import { startGame, startMatch } from "./application/use-cases/startMatch.js";
import { beginNaming } from "./application/use-cases/beginNaming.js";
import { chooseName } from "./application/use-cases/chooseName.js";
import { finishNaming } from "./application/use-cases/finishNaming.js";
import { submitCommand, type SubmitCommandDeps } from "./application/use-cases/submitCommand.js";
import type { NarrationStore, Narrator, PushSender, PushSubscriptionStore, Scheduler } from "./application/ports.js";
import type { GameEventEnvelope } from "@el-pueblo/engine";

/**
 * Dependencias de infraestructura: la unión de los puertos que usan los casos de uso.
 * El resto de la aplicación solo ve los puertos, nunca los adaptadores.
 */
export type Deps = Omit<SubmitCommandDeps, "queue" | "advance" | "afterEvents"> & CreateRoomDeps & {
  scheduler: Scheduler;
  narrations: NarrationStore;
  narrator: Narrator;
  push: PushSubscriptionStore;
  pushSender: PushSender;
  retention: RetentionPolicy;
};

/** Retraso de los bots tras cada fase: parecen jugadores pensando, sin tardar en exceso. */
const BOT_DELAY_MS = { min: 1500, spread: 5500 };

/** Ensambla los casos de uso. Es el único sitio que conoce a los adaptadores concretos. */
export function createServices(deps: Deps) {
  const queue = new KeyedQueue();
  const narrateEvents = narrate({ ...deps, queue });
  const notify = notifyPhases({ push: deps.push, sender: deps.pushSender, queue });
  const pendingNarrations = new Set<Promise<void>>();
  const botKey = (matchId: string) => `${matchId}:bots`;

  // Los bots tienen su propio temporizador (otra clave del planificador) para no pisar el de la fase.
  const scheduleBots = (matchId: string) => {
    const delay = BOT_DELAY_MS.min + Math.floor(Math.random() * BOT_DELAY_MS.spread);
    deps.scheduler.schedule(botKey(matchId), delay, () => void runBots(matchId).catch(() => undefined));
  };

  const afterEvents = (matchId: string, events: GameEventEnvelope[]) => {
    const notified = notify(matchId, events);
    // Al terminar la partida ya no hacen falta sus suscripciones push: se borran después de avisar.
    const ended = events.some((e) => e.type === "game.ended");
    const jobs = [ended ? notified.finally(() => deps.push.removeByMatch(matchId)) : notified, narrateEvents(matchId, events)];
    for (const job of jobs) {
      const pending = job.catch(() => undefined);
      pendingNarrations.add(pending);
      void pending.finally(() => pendingNarrations.delete(pending));
    }
    if (events.some((e) => e.type === "game.ended")) deps.scheduler.cancel(botKey(matchId));
    else if (events.some((e) => e.type === "phase.started")) scheduleBots(matchId);
  };
  const advance = advanceOnTimeout({ ...deps, queue, afterEvents });
  const submit = submitCommand({ ...deps, queue, advance, afterEvents });
  const runBots = botTurn({ ...deps, submit });
  // La elección de nombres cierra en la misma cola que la partida, con el mismo arranque.
  const startDeps = { ...deps, queue, advance, afterEvents };
  const finishNamingUseCase = finishNaming({ matches: deps.matches, players: deps.players, queue, game: startGame(startDeps) });
  return {
    createRoom: createRoom(deps),
    joinRoom: joinRoom(deps),
    startMatch: startMatch(startDeps),
    beginNaming: beginNaming({ ...deps, queue, finish: finishNamingUseCase }),
    chooseName: chooseName({ ...deps, queue }),
    submitCommand: submit,
    /** Espera a que terminen las narraciones pendientes (para tests y para apagar el servidor). */
    drainNarrations: async () => {
      while (pendingNarrations.size > 0) await Promise.all([...pendingNarrations]);
    },
    reconnect: reconnect(deps),
    subscribePush: subscribePush(deps),
    pushPublicKey: () => deps.pushSender.publicKey(),
    getView: getView(deps),
    setConnection: setConnection(deps),
    recoverTimers: recoverTimers({ ...deps, scheduleBots, finishNaming: finishNamingUseCase }),
    /** Borra partidas y salas fuera de plazo (ver RetentionPolicy). Se ejecuta al arrancar y cada hora. */
    purgeExpired: purgeExpired({ matches: deps.matches, push: deps.push, clock: deps.clock, policy: deps.retention }),
    advance,
    /** Turno de los bots de una partida. Lo usan los temporizadores y los tests. */
    runBots,
    botKey,
  };
}

export type Services = ReturnType<typeof createServices>;
