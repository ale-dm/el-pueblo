import type { Clock, MatchStore, PushSubscriptionStore } from "../ports.js";

/** Plazos de borrado. Ver docs/DATABASE.md, "Retención". */
export interface RetentionPolicy {
  /** Salas en lobby que nunca empezaron: se borran pasadas estas horas desde su creación. */
  lobbyTtlHours: number;
  /** Partidas terminadas (o abandonadas): se borran pasados estos días desde que terminaron. */
  finishedRetentionDays: number;
}

export interface RetentionDeps {
  matches: MatchStore;
  push: PushSubscriptionStore;
  clock: Clock;
  policy: RetentionPolicy;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Borra lo que ya no hace falta: salas abandonadas, partidas terminadas fuera de plazo (con sus eventos,
 * chat, narraciones y nicks) y las suscripciones push de partidas que ya terminaron.
 */
export function purgeExpired(deps: RetentionDeps) {
  return async (): Promise<{ lobbies: number; finished: number }> => {
    const now = deps.clock.now().getTime();
    const lobbyCutoff = now - deps.policy.lobbyTtlHours * HOUR_MS;
    const finishedCutoff = now - deps.policy.finishedRetentionDays * DAY_MS;

    let lobbies = 0;
    for (const match of await deps.matches.listByStatus("lobby")) {
      if (match.createdAt.getTime() < lobbyCutoff) {
        await deps.matches.delete(match.id);
        lobbies++;
      }
    }

    let finished = 0;
    for (const status of ["finished", "abandoned"] as const) {
      for (const match of await deps.matches.listByStatus(status)) {
        await deps.push.removeByMatch(match.id);
        const endedAt = (match.endedAt ?? match.createdAt).getTime();
        if (endedAt < finishedCutoff) {
          await deps.matches.delete(match.id);
          finished++;
        }
      }
    }
    return { lobbies, finished };
  };
}
