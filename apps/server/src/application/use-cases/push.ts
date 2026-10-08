import type { GameEventEnvelope } from "@el-pueblo/engine";
import type { KeyedQueue } from "../concurrency/keyedQueue.js";
import { AppError } from "../errors.js";
import type { PushSender, PushSubscriptionStore, MatchStore, PlayerStore, Security } from "../ports.js";

const PHASE_TEXT: Record<string, { title: string; body: string }> = {
  discussion: { title: "El Pueblo", body: "Amanece: hora de hablar." },
  night: { title: "El Pueblo", body: "Cae la noche. Elige tu acción." },
};

/** Guarda la suscripción de un jugador (identificado por su token de la partida). */
export function subscribePush(deps: { matches: MatchStore; players: PlayerStore; security: Security; push: PushSubscriptionStore }) {
  return async (input: { matchId: string; token: string; endpoint: string; p256dh: string; auth: string }): Promise<void> => {
    const match = await deps.matches.findById(input.matchId);
    if (!match) throw new AppError("not_found", "Partida no encontrada");
    const player = await deps.players.findByTokenHash(match.id, deps.security.hashToken(input.token));
    if (!player) throw new AppError("forbidden", "Token no válido para esta partida");
    if (!input.endpoint.startsWith("https://")) throw new AppError("invalid_input", "Suscripción no válida");
    await deps.push.upsert({ matchPlayerId: player.id, matchId: match.id, endpoint: input.endpoint, p256dh: input.p256dh, auth: input.auth });
  };
}

/**
 * Avisa cuando empieza el día o la noche. El texto es genérico: nunca dice quién murió ni qué pasó.
 * Las suscripciones que el navegador ya no acepta se borran.
 */
export function notifyPhases(deps: { push: PushSubscriptionStore; sender: PushSender; queue: KeyedQueue }) {
  return (matchId: string, events: readonly GameEventEnvelope[]): Promise<void> => {
    const phases = events.filter((e) => e.type === "phase.started").map((e) => e.payload.phase as string);
    const message = PHASE_TEXT[phases.at(-1) ?? ""];
    if (!message) return Promise.resolve();
    return deps.queue.run(`push:${matchId}`, async () => {
      const subs = await deps.push.listByMatch(matchId);
      await Promise.all(
        subs.map(async (sub) => {
          const result = await deps.sender.send(sub, { ...message, url: "/" });
          if (result === "gone") await deps.push.remove(sub.endpoint);
        }),
      );
    });
  };
}
